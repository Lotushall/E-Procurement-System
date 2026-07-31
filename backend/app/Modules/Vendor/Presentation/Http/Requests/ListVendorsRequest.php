<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use App\Modules\User\Domain\Enums\UserType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListVendorsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->user_type === UserType::Internal;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(['pending', 'approved', 'rejected'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
