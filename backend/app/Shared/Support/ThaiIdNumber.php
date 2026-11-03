<?php

namespace App\Shared\Support;

/**
 * The 13-digit identification number shared by the Thai citizen ID, the
 * individual and juristic tax ID, and the juristic person registration
 * number. The 13th digit is a mod-11 check digit over the first twelve, each
 * weighted from 13 down to 2.
 */
final class ThaiIdNumber
{
    public const int LENGTH = 13;

    /**
     * Whether the value is exactly 13 ASCII digits with a correct check digit.
     */
    public static function isValid(string $value): bool
    {
        if (! self::hasValidFormat($value)) {
            return false;
        }

        return self::checkDigit(substr($value, 0, self::LENGTH - 1)) === (int) $value[self::LENGTH - 1];
    }

    /**
     * Whether the value is exactly 13 ASCII digits, regardless of the check digit.
     */
    public static function hasValidFormat(string $value): bool
    {
        return preg_match('/\A[0-9]{13}\z/', $value) === 1;
    }

    /**
     * Append the check digit to the first twelve digits of an ID number.
     */
    public static function withCheckDigit(string $firstTwelveDigits): string
    {
        return $firstTwelveDigits.self::checkDigit($firstTwelveDigits);
    }

    private static function checkDigit(string $firstTwelveDigits): int
    {
        if (preg_match('/\A[0-9]{12}\z/', $firstTwelveDigits) !== 1) {
            throw new \InvalidArgumentException('The check digit needs exactly the first 12 digits.');
        }

        $sum = 0;

        foreach (str_split($firstTwelveDigits) as $index => $digit) {
            $sum += (int) $digit * (self::LENGTH - $index);
        }

        return (11 - ($sum % 11)) % 10;
    }
}
