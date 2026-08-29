<?php

namespace App\Modules\Tender\Infrastructure\Models;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Table('tors')]
#[Fillable([
    'tor_code',
    'title',
    'scope_of_work',
    'department_id',
    'tender_project_id',
    'budget_estimate',
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
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'budget_estimate' => 'decimal:2',
            'bidding_start_at' => 'datetime',
            'bidding_end_at' => 'datetime',
            'approved_at' => 'datetime',
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

    public function TorsDocuments(): HasMany
    {
        return $this->hasMany(TorDocuments::class, 'tor_id');
    }
}
