<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// use App\Modules\Vendor\Database\Factories\VendorCompanyDetailsFactory;

#[Table('vendor_company_details')]
#[Fillable([
    'vendor_profile_id',
    'company_name',
    'business_registration_no',
    'tax_id',
    'tax_id_hash',
    'branch_no',
    'business_type',
    'address',
    'province',
    'postal_code',
])]
#[Hidden(['tax_id', 'tax_id_hash'])]
class VendorCompanyDetails extends Model
{
    use HasFactory;

    // protected static function newFactory(): VendorCompanyDetailsFactory
    // {
    //     // return VendorCompanyDetailsFactory::new();
    // }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tax_id' => 'encrypted',
        ];
    }

    /**
     * Deterministic lookup hash for a tax ID, used because `tax_id` itself is
     * encrypted (non-deterministic ciphertext) and can't be queried directly.
     */
    public static function hashTaxId(string $taxId): string
    {
        return hash('sha256', $taxId);
    }

    // Relations
    public function VendorDocumentsVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }
}
