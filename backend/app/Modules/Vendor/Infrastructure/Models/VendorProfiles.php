<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\States\VerificationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
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

    // Relations
    public function VendorProfilesUser(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function VendorProfilesVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function VendorProfilesCompanyDetail(): HasOne
    {
        return $this->hasOne(VendorCompanyDetails::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesIndividualDetail(): HasOne
    {
        return $this->hasOne(VendorIndividualDetails::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesDocuments(): HasMany
    {
        return $this->hasMany(VendorDocuments::class, 'vendor_profile_id', 'id');
    }
}
