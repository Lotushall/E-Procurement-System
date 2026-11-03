<?php

namespace App\Modules\Auth\Presentation\Http\Requests;

use App\Rules\ThaiIdNumberRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Strip formatting characters before validation so masked input
     * (e.g. "0-0000-00000-00-0") is checked against its raw digit length.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'taxId' => $this->digitsOnly('taxId'),
            'idCard' => $this->digitsOnly('idCard'),
            'phone' => $this->digitsOnly('phone'),
        ]);
    }

    private function digitsOnly(string $key): mixed
    {
        $value = $this->input($key);

        // Blank input, or anything but text (an array), is left for the rules to judge.
        if (! $this->filled($key) || ! is_string($value)) {
            return $value;
        }

        return preg_replace('/\D/', '', $value);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'vendorType' => ['required', 'in:company,individual'],
            'companyName' => ['required_if:vendorType,company', 'nullable', 'string', 'max:255'],
            'taxId' => ['required_if:vendorType,company', 'nullable', new ThaiIdNumberRule('เลขประจำตัวผู้เสียภาษี')],
            'fullName' => ['required_if:vendorType,individual', 'nullable', 'string', 'max:255'],
            'idCard' => ['required_if:vendorType,individual', 'nullable', new ThaiIdNumberRule('เลขบัตรประจำตัวประชาชน')],
            'storeName' => ['required_if:vendorType,individual', 'nullable', 'string', 'max:255'],
            'phone' => ['required', 'digits_between:9,10'],
            'username' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('users', 'username')],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', Password::defaults(), 'confirmed'],
            'confirmPassword' => ['required', 'string'],
            'terms' => ['required', 'accepted'],
        ];
    }
}
