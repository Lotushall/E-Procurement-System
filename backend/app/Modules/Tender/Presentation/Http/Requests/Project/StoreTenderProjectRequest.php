<?php

namespace App\Modules\Tender\Presentation\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenderProjectRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'budget' => ['required', 'numeric', 'gt:0', 'decimal:0,2', 'max:999999999999.99'],
            'departmentId' => ['required', 'integer', Rule::exists('departments', 'id')],
            'personInChargeId' => ['nullable', 'integer', Rule::exists('internal_profiles', 'id')],
            'procurementMethod' => ['required', 'string', 'max:255'],
            'fiscalYear' => ['required', 'integer', 'between:0,65535'],
            'projectStartAt' => ['required', 'date'],
            'projectEndAt' => ['required', 'date', 'after_or_equal:projectStartAt'],
        ];
    }
}
