<?php

namespace App\Rules;

use App\Shared\Support\ThaiIdNumber;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * A 13-digit Thai identification number (citizen ID, tax ID, or juristic
 * person registration number) with a correct check digit.
 *
 * With $allowsMasked, the masked form the profile endpoint returns
 * ("xxxxxxxxx1234") also passes, meaning the vendor left the field unedited
 * and the stored number stays.
 */
class ThaiIdNumberRule implements ValidationRule
{
    public function __construct(
        private readonly string $label,
        private readonly bool $allowsMasked = false,
    ) {}

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail("{$this->label}ต้องเป็นตัวเลข 13 หลัก");

            return;
        }

        if ($this->allowsMasked && preg_match('/\A[xX]{9}[0-9]{4}\z/', $value) === 1) {
            return;
        }

        if (! ThaiIdNumber::hasValidFormat($value)) {
            $fail("{$this->label}ต้องเป็นตัวเลข 13 หลัก");

            return;
        }

        if (! ThaiIdNumber::isValid($value)) {
            $fail("{$this->label}ไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง");
        }
    }
}
