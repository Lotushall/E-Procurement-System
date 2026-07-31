<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use Database\Factories\VendorContactFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Table('vendor_contact')]
#[Fillable([
    'vendor_profile_id',
    'contact_name',
    'contact_position',
    'contact_phone',
    'contact_email',
    'line_id',
    'other_contact',
    'is_main_contact',
])]
class VendorContact extends Model
{
    use HasFactory;

    protected static function newFactory(): VendorContactFactory
    {
        return VendorContactFactory::new();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_main_contact' => 'boolean',
        ];
    }

    // Relations
    public function VendorContactVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }
}
