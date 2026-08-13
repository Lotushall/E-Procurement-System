<?php

namespace App\Modules\User\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListUsersRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['nullable', 'string', Rule::in(['internal', 'company', 'individual'])],
            'status' => ['nullable', 'string', Rule::in(['pending', 'active', 'suspended', 'inactive'])],
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'string', Rule::in(['created_at', 'username', 'email'])],
            'sort_direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
