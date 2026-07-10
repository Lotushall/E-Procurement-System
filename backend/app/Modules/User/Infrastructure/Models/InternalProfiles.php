<?php

namespace App\Modules\User\Infrastructure\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// use App\Modules\User\Database\Factories\InternalProfilesFactory;
#[Table('internal_profiles')]
#[Fillable(['user_id', 'employee_no', 'prefix', 'firstname', 'lastname', 'department', 'position', 'phone'])]
class InternalProfiles extends Model
{
    use HasFactory;

    // protected static function newFactory(): InternalProfilesFactory
    // {
    //     // return InternalProfilesFactory::new();
    // }
}
