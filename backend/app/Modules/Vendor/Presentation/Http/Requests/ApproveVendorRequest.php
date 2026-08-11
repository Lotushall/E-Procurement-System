<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use App\Modules\User\Domain\Enums\UserType;
use Illuminate\Foundation\Http\FormRequest;

class ApproveVendorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->user_type === UserType::Internal;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'remark' => ['nullable', 'string'],
            'send_email' => ['sometimes', 'boolean'],
        ];
    }
}
