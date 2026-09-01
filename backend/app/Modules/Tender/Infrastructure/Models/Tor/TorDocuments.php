<?php

namespace App\Modules\Tender\Infrastructure\Models\Tor;

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Table('tor_documents')]
#[Fillable([
    'label',
    'tor_id',
    'file_name',
    'file_path',
    'uploaded_by',
    'document_type',
])]
#[Hidden(['file_path'])]
class TorDocuments extends Model
{
    use HasFactory;

    // Relations
    public function TorDocumentsTor(): BelongsTo
    {
        return $this->belongsTo(Tors::class, 'tor_id');
    }

    public function TorDocumentsUploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
