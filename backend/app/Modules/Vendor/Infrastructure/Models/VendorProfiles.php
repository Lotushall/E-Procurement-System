<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\Vendor\Domain\States\VerificationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\ModelStates\HasStates;

// use App\Modules\Vendor\Database\Factories\VendorProfilesFactory;
#[Table('vendor_profiles')]
#[Fillable([
    'user_id',
    'verification_status',
    'verified_at',
    'verified_by',
    'remark',
])]
class VendorProfiles extends Model
{
    use HasFactory, HasStates;

    // protected static function newFactory(): VendorProfilesFactory
    // {
    //     // return VendorProfilesFactory::new();
    // }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'verification_status' => VerificationStatus::class,
        ];
    }
}
