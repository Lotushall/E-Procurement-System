<?php

namespace App\Modules\Vendor\Presentation\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorDocumentResource extends JsonResource
{
    public static $wrap = false;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'documentType' => $this->document_type,
            'fileName' => $this->file_name,
            'filePath' => $this->file_path,
            'status' => $this->status,
            'verifiedBy' => $this->verified_by,
            'verifiedAt' => $this->verified_at,
            'remark' => $this->remark,
        ];
    }
}
