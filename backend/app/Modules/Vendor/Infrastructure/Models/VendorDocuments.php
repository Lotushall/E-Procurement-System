<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\States\DocumentStatus;
use Database\Factories\VendorDocumentsFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\ModelStates\HasStates;

#[Table('vendor_documents')]
#[Fillable([
    'vendor_profile_id',
    'document_type',
    'file_name',
    'file_path',
    'status',
    'verified_by',
    'verified_at',
    'remark',
])]
#[Hidden(['file_path'])]
class VendorDocuments extends Model
{
    use HasFactory, HasStates;

    protected static function newFactory(): VendorDocumentsFactory
    {
        return VendorDocumentsFactory::new();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'status' => DocumentStatus::class,
        ];
    }

    // Relations
    public function VendorDocumentsVendorProfile(): BelongsTo
    {
        return $this->belongsTo(VendorProfiles::class, 'vendor_profile_id', 'id');
    }

    public function VendorDocumentsVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
