<?php

namespace App\Modules\Shared\Domain\ValueObjects;

use InvalidArgumentException;

final class PhoneNumber
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        $digits = preg_replace('/\D/', '', $value);

        if (! preg_match('/^\d{9,10}$/', $digits)) {
            throw new InvalidArgumentException("Invalid phone number: {$value}");
        }

        return new self($digits);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
