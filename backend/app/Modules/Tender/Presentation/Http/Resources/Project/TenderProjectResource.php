<?php

namespace App\Modules\Tender\Presentation\Http\Resources\Project;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenderProjectResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id(),
            'projectCode' => $this->projectCode()->value,
            'name' => $this->name(),
            'description' => $this->whenNotNull($this->description()),
            'budget' => $this->budget()->amount,
            'departmentId' => $this->departmentId(),
            'personInChargeId' => $this->whenNotNull($this->personInChargeId()),
            'createdBy' => $this->createdBy(),
            'procurementMethod' => $this->procurementMethod(),
            'fiscalYear' => $this->fiscalYear(),
            'projectStartAt' => $this->whenNotNull($this->projectStartAt()?->toIso8601String()),
            'projectEndAt' => $this->whenNotNull($this->projectEndAt()?->toIso8601String()),
            'status' => $this->status(),
        ];
    }
}
