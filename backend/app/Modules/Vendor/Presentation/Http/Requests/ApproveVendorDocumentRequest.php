<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveVendorDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'send_email' => ['sometimes', 'boolean'],
        ];
    }
}
