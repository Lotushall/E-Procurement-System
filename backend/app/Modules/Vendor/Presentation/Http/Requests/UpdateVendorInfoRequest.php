<?php

namespace App\Modules\Vendor\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVendorInfoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalize sensitive ID fields to digits only before validation, unless
     * the submitted value is still the masked placeholder the profile
     * endpoint returns (e.g. "xxxxxxxxx1234") — in that case the field was
     * never edited, so keep the vendor's current stored value instead of
     * stripping the mask characters down to a handful of leftover digits.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'businessRegistrationNo' => $this->digitsOnly('businessRegistrationNo'),
            'taxId' => $this->digitsOnly('taxId'),
            'citizenId' => $this->digitsOnly('citizenId'),
            'postalCode' => trim((string) $this->input('postalCode')),
        ]);
    }

    private function digitsOnly(string $key): ?string
    {
        $value = $this->input($key);

        if ($value === null || $value === '') {
            return null;
        }

        // ถ้ายังเป็นค่าที่ frontend mask มา
        // ปล่อยไว้ให้ UseCase เป็นคนตัดสินใจ
        if (preg_match('/x/i', $value)) {
            return $value;
        }

        $digits = preg_replace('/\D/', '', (string) $value);

        return $digits === '' ? null : $digits;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Fields are grouped below as company-only, individual-only, and shared
     * across both vendor types.
     */
    public function rules(): array
    {
        return [
            'vendorType' => ['required', 'in:company,individual'],

            /*
             |---------------------------------
             | Company
             |---------------------------------
             */
            'companyName' => ['required_if:vendorType,company', 'string', 'max:255'],
            'businessRegistrationNo' => ['required_if:vendorType,company', 'digits:13'],
            'branchNo' => ['nullable', 'string', 'max:255'],

            /*
             |---------------------------------
             | Individual
             |---------------------------------
             */
            'storeName' => ['required_if:vendorType,individual', 'string', 'max:255'],
            'prefix' => ['nullable', 'string', 'max:255'],
            'firstname' => ['required_if:vendorType,individual', 'string', 'max:255'],
            'lastname' => ['required_if:vendorType,individual', 'string', 'max:255'],
            'citizenId' => ['required_if:vendorType,individual', 'digits:13'],

            /*
             |---------------------------------
             | Shared
             |---------------------------------
             */
            'businessType' => ['required', 'string', 'max:255'],
            'taxId' => ['nullable', 'digits:13'],
            'address' => ['required', 'string'],
            'province' => ['required', 'string', 'max:255'],
            'postalCode' => ['required', 'digits:5'],
        ];
    }
}
