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
     * Strip formatting characters from contactPhone before validation, since
     * the frontend sends it live-formatted (e.g. "081-234-5678").
     */
    protected function prepareForValidation(): void
    {
        $phone = $this->input('contactPhone');

        if ($phone !== null && $phone !== '') {
            $this->merge(['contactPhone' => preg_replace('/\D/', '', (string) $phone)]);
        }
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
