<?php

namespace App\Modules\Tender\Infrastructure\Models\Project;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Database\Factories\TenderProjectsFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Table('tenders_projects')]
#[Fillable([
    'project_code',
    'name',
    'description',
    'budget',
    'department_id',
    'person_in_charge_id',
    'created_by',
    'procurement_method',
    'fiscal_year',
    'project_start_at',
    'project_end_at',
    'status',
])]
class TenderProjects extends Model
{
    use HasFactory;

    protected static function newFactory(): TenderProjectsFactory
    {
        return TenderProjectsFactory::new();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'budget' => 'decimal:2',
            'fiscal_year' => 'integer',
            'project_start_at' => 'datetime',
            'project_end_at' => 'datetime',
        ];
    }

    // Relations
    public function TenderProjectsDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function TenderProjectsPersonInCharge(): BelongsTo
    {
        return $this->belongsTo(InternalProfiles::class, 'person_in_charge_id');
    }

    public function TenderProjectsCreatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function TenderProjectsTors(): HasMany
    {
        return $this->hasMany(Tors::class, 'tender_project_id');
    }

    /**
     * Add allocated_budget: the summed budget estimate of the project's
     * non-cancelled TORs. It counts every TOR, not just the ones a viewer
     * may see, because it is a fact about the project. Cast as a decimal so
     * the sum never passes through a float.
     */
    #[Scope]
    protected function withAllocatedBudget(Builder $query): void
    {
        $query->withSum(
            ['TenderProjectsTors as allocated_budget' => fn (Builder $query) => $query->allocated()],
            'budget_estimate',
        )->withCasts(['allocated_budget' => 'decimal:2']);
    }

    /**
     * Scope a query to projects whose name or project code matches the given search term.
     */
    #[Scope]
    protected function search(Builder $query, ?string $search): void
    {
        if ($search === null) {
            return;
        }

        $search = trim($search);

        if ($search === '') {
            return;
        }

        $term = '%'.$search.'%';

        $query->where(function (Builder $query) use ($term) {
            $query->where('name', 'like', $term)
                ->orWhere('project_code', 'like', $term);
        });
    }

    /**
     * Scope a query to only include projects with the given status.
     */
    #[Scope]
    protected function status(Builder $query, ?string $status): void
    {
        $query->when($status !== null, fn (Builder $query) => $query->where('status', $status));
    }

    /**
     * Scope a query to only include projects in the given department.
     */
    #[Scope]
    protected function departmentId(Builder $query, ?int $departmentId): void
    {
        $query->when($departmentId !== null, fn (Builder $query) => $query->where('department_id', $departmentId));
    }

    /**
     * Scope a query to only include projects in the given fiscal year.
     */
    #[Scope]
    protected function fiscalYear(Builder $query, ?int $fiscalYear): void
    {
        $query->when($fiscalYear !== null, fn (Builder $query) => $query->where('fiscal_year', $fiscalYear));
    }

    /**
     * Scope a query to only include projects whose start-end period falls
     * entirely within the given date range.
     */
    #[Scope]
    protected function dateRange(Builder $query, ?string $dateFrom, ?string $dateTo): void
    {
        $query
            ->when($dateFrom !== null, fn (Builder $query) => $query->whereDate('project_start_at', '>=', $dateFrom))
            ->when($dateTo !== null, fn (Builder $query) => $query->whereDate('project_end_at', '<=', $dateTo));
    }

    /**
     * Scope a query to sort by the given whitelisted column (defaults to created_at).
     */
    #[Scope]
    protected function sort(Builder $query, ?string $sortBy, ?string $sortDirection = null): void
    {
        $direction = $sortDirection === 'asc' ? 'asc' : 'desc';

        $query->orderBy(
            in_array($sortBy, ['project_code', 'name', 'budget', 'fiscal_year'], true) ? $sortBy : 'created_at',
            $direction,
        );
    }
}
