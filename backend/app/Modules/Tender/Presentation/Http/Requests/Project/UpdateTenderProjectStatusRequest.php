<?php

namespace App\Modules\Tender\Presentation\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTenderProjectStatusRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(['draft', 'published', 'closed', 'completed', 'cancelled', 'archived'])],
        ];
    }
}
