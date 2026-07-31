<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use Database\Factories\VendorIndividualDetailsFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Table('vendor_individual_details')]
#[Fillable([
    'vendor_profile_id',
    'store_name',
    'prefix',
    'firstname',
    'lastname',
    'citizen_id',
    'citizen_id_hash',
    'business_type',
    'tax_id',
    'tax_id_hash',
    'address',
    'province',
    'postal_code',
])]
#[Hidden(['citizen_id', 'citizen_id_hash', 'tax_id', 'tax_id_hash'])]
class VendorIndividualDetails extends Model
{
    use HasFactory;

    protected static function newFactory(): VendorIndividualDetailsFactory
    {
        return VendorIndividualDetailsFactory::new();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'citizen_id' => 'encrypted',
            'tax_id' => 'encrypted',
        ];
    }

    /**
     * Deterministic lookup hash for a citizen ID, used because `citizen_id` itself is
     * encrypted (non-deterministic ciphertext) and can't be queried directly.
     */
    public static function hashCitizenId(string $citizenId): string
    {
        return hash('sha256', $citizenId);
    }

    /**
     * Deterministic lookup hash for a tax ID (same reasoning as hashCitizenId).
     */
    public static function hashTaxId(string $taxId): string
    {
        return hash('sha256', $taxId);
    }

    // Relations
    public function VendorIndividualDetailsVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }
}
