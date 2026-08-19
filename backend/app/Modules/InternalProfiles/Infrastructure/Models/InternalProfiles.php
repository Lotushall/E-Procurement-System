<?php

namespace App\Modules\InternalProfiles\Infrastructure\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
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

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
