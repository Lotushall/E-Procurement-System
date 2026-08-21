<?php

namespace App\Modules\InternalProfiles\Infrastructure\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// use App\Modules\InternalProfiles\Database\Factories\InternalProfilesFactory;
#[Table('internal_profiles')]
#[Fillable(['user_id', 'employee_no', 'prefix', 'firstname', 'lastname', 'department_id', 'position_id', 'phone'])]
class InternalProfiles extends Model
{
    use HasFactory;

    // protected static function newFactory(): InternalProfilesFactory
    // {
    //     // return InternalProfilesFactory::new();
    // }
    #[Scope]
    public function search(Builder $query, ?string $search)
    {
        if ($search === null || trim($search) === '') {
            return;
        }

        $term = '%'.$search.'%';

        $query->where(function (Builder $query) use ($term) {
            $query->where('employee_no', 'like', $term)
                ->orWhere('firstname', 'like', $term)
                ->orWhere('lastname', 'like', $term)
                ->orWhere('phone', 'like', $term);
        });
    }

    #[Scope]
    protected function department(Builder $query, ?int $departmentId): void
    {
        $query->when($departmentId !== null, fn (Builder $query) => $query->where('department_id', $departmentId));
    }

    #[Scope]
    protected function position(Builder $query, ?int $positionId): void
    {
        $query->when($positionId !== null, fn (Builder $query) => $query->where('position_id', $positionId));
    }

    /**
     * Scope a query to sort by the given whitelisted column (defaults to id).
     * Sorting by department/position sorts by the related name via a join.
     */
    #[Scope]
    protected function sort(Builder $query, ?string $sortBy, ?string $sortDirection = null): void
    {
        $direction = $sortDirection === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'department') {
            $query->select('internal_profiles.*')
                ->leftJoin('departments', 'departments.id', '=', 'internal_profiles.department_id')
                ->orderBy('departments.name', $direction)
                ->orderBy('internal_profiles.id');

            return;
        }

        if ($sortBy === 'position') {
            $query->select('internal_profiles.*')
                ->leftJoin('positions', 'positions.id', '=', 'internal_profiles.position_id')
                ->orderBy('positions.name', $direction)
                ->orderBy('internal_profiles.id');

            return;
        }

        $query->orderBy(
            in_array($sortBy, ['employee_no', 'firstname', 'lastname'], true) ? $sortBy : 'id',
            $direction,
        );
    }

    public function InternalProfileDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function InternalProfilePosition(): BelongsTo
    {
        return $this->belongsTo(Position::class, 'position_id');
    }
}
