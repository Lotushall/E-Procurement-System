<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVendorContactRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'id' => ['nullable', 'integer'],
            'contactName' => ['required', 'string', 'max:255'],
            'contactPosition' => ['nullable', 'string', 'max:255'],
            'contactPhone' => ['nullable', 'digits_between:9,10'],
            'contactEmail' => ['nullable', 'email', 'max:255'],
            'lineId' => ['nullable', 'string', 'max:255'],
            'otherContact' => ['nullable', 'string', 'max:255'],
            'isMainContact' => ['required', 'boolean'],
        ];
    }
}
