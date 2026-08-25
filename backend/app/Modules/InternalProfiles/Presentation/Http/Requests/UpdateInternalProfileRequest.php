<?php

namespace App\Modules\InternalProfiles\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInternalProfileRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'prefix' => ['nullable', 'string'],
            'firstname' => ['required', 'string'],
            'lastname' => ['required', 'string'],
            'employeeNo' => ['nullable', 'string'],
            'departmentId' => ['nullable', 'integer', Rule::exists('departments', 'id')],
            'positionId' => ['nullable', 'integer', Rule::exists('positions', 'id')],
            'phone' => ['nullable', 'string'],
        ];
    }
}
