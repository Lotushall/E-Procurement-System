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
            'id' => $this->id,
            'documentType' => $this->whenNotNull($this->document_type),
            'fileName' => $this->whenNotNull($this->file_name),
            'filePath' => $this->whenNotNull($this->file_path),
            'status' => $this->whenNotNull($this->status),
            'verifiedBy' => $this->whenNotNull($this->verified_by),
            'verifiedAt' => $this->whenNotNull($this->verified_at),
            'remark' => $this->whenNotNull($this->remark),
        ];
    }
}
