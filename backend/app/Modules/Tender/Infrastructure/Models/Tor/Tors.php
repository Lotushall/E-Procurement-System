<?php

namespace App\Modules\Tender\Infrastructure\Models\Tor;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Domain\States\TorStatus;
use App\Modules\Tender\Domain\States\TorStatus\Cancelled;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Database\Factories\TorsFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\ModelStates\HasStates;

#[Table('tors')]
#[Fillable([
    'tor_code',
    'title',
    'scope_of_work',
    'department_id',
    'tender_project_id',
    'budget_estimate',
    'procurement_method',
    'fiscal_year',
    'bidding_start_at',
    'bidding_end_at',
    'status',
    'created_by',
    'approved_by',
    'approved_at',
    'remark',
])]
class Tors extends Model
{
    use HasFactory, HasStates;

    /**
     * Relations TorResource reads, including the nested ones its user
     * summaries read. Both TOR queries eager-load these because
     * Model::preventLazyLoading() is on.
     *
     * @var list<string>
     */
    public const array RESOURCE_RELATIONS = [
        'TorsDepartment',
        'TorsTenderProject',
        'TorsCreatedBy.UserInternalProfile.InternalProfileDepartment',
        'TorsApprovedBy.UserInternalProfile.InternalProfileDepartment',
    ];

    protected static function newFactory(): TorsFactory
    {
        return TorsFactory::new();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'budget_estimate' => 'decimal:2',
            'fiscal_year' => 'integer',
            'bidding_start_at' => 'datetime',
            'bidding_end_at' => 'datetime',
            'approved_at' => 'datetime',
            'status' => TorStatus::class,
        ];
    }

    // Relations
    public function TorsDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function TorsTenderProject(): BelongsTo
    {
        return $this->belongsTo(TenderProjects::class, 'tender_project_id');
    }

    public function TorsCreatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function TorsApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scope a query to the TORs the viewer may see. Only the widest TOR view
     * permission the viewer holds applies: tors.viewAny (every TOR), then
     * tors.viewDepartment (their profile department), then tors.viewOwn
     * (TORs they created). With none of them, nothing matches.
     */
    #[Scope]
    protected function visibleTo(Builder $query, User $viewer): void
    {
        if ($viewer->checkPermissionTo('tors.viewAny')) {
            return;
        }

        if ($viewer->checkPermissionTo('tors.viewDepartment')) {
            $departmentId = $viewer->UserInternalProfile?->department_id;

            if ($departmentId === null) {
                $query->whereRaw('1 = 0');

                return;
            }

            $query->where('department_id', $departmentId);

            return;
        }

        if ($viewer->checkPermissionTo('tors.viewOwn')) {
            $query->where('created_by', $viewer->id);

            return;
        }

        $query->whereRaw('1 = 0');
    }

    /**
     * Scope a query to TORs whose title or TOR code matches the given search term.
     */
    #[Scope]
    protected function search(Builder $query, ?string $search): void
    {
        $search = $search === null ? '' : trim($search);

        if ($search === '') {
            return;
        }

        $term = '%'.$search.'%';

        $query->where(function (Builder $query) use ($term) {
            $query->where('title', 'like', $term)
                ->orWhere('tor_code', 'like', $term);
        });
    }

    /**
     * Scope a query to only include TORs with the given status.
     */
    #[Scope]
    protected function status(Builder $query, ?string $status): void
    {
        $query->when($status !== null, fn (Builder $query) => $query->where('status', $status));
    }

    /**
     * Scope a query to TORs that still hold part of their project's budget:
     * every TOR except cancelled ones (ยอดจัดสรร in CONTEXT.md).
     */
    #[Scope]
    protected function allocated(Builder $query): void
    {
        $query->whereNotState('status', Cancelled::class);
    }

    /**
     * Scope a query to only include TORs in the given department.
     */
    #[Scope]
    protected function departmentId(Builder $query, ?int $departmentId): void
    {
        $query->when($departmentId !== null, fn (Builder $query) => $query->where('department_id', $departmentId));
    }

    /**
     * Scope a query to only include TORs in the given fiscal year.
     */
    #[Scope]
    protected function fiscalYear(Builder $query, ?int $fiscalYear): void
    {
        $query->when($fiscalYear !== null, fn (Builder $query) => $query->where('fiscal_year', $fiscalYear));
    }

    /**
     * Scope a query to TORs in the given tender project, or to TORs outside
     * any project when given 'none'.
     */
    #[Scope]
    protected function tenderProject(Builder $query, ?string $tenderProject): void
    {
        if ($tenderProject === null) {
            return;
        }

        if ($tenderProject === 'none') {
            $query->whereNull('tender_project_id');

            return;
        }

        $query->where('tender_project_id', (int) $tenderProject);
    }

    /**
     * Scope a query to only include TORs using the given procurement method.
     */
    #[Scope]
    protected function procurementMethod(Builder $query, ?string $procurementMethod): void
    {
        $query->when($procurementMethod !== null, fn (Builder $query) => $query->where('procurement_method', $procurementMethod));
    }

    /**
     * Scope a query to sort by the given whitelisted column (defaults to created_at).
     */
    #[Scope]
    protected function sort(Builder $query, ?string $sortBy, ?string $sortDirection = null): void
    {
        $direction = $sortDirection === 'asc' ? 'asc' : 'desc';

        $query->orderBy(
            in_array($sortBy, ['tor_code', 'title', 'budget_estimate', 'fiscal_year', 'bidding_end_at'], true) ? $sortBy : 'created_at',
            $direction,
        );
    }
}
