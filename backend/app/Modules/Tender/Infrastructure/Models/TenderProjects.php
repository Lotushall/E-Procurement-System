<?php

namespace App\Modules\Tender\Infrastructure\Models;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
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
}
