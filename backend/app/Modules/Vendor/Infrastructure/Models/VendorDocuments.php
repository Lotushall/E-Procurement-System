<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\Vendor\Domain\States\DocumentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\ModelStates\HasStates;

// use App\Modules\Vendor\Database\Factories\VendorDocumentsFactory;
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

    // protected static function newFactory(): VendorDocumentsFactory
    // {
    //     // return VendorDocumentsFactory::new();
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
            'status' => DocumentStatus::class,
        ];
    }
}
