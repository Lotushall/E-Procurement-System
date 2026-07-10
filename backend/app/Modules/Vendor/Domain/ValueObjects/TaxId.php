<?php

namespace App\Modules\Vendor\Domain\ValueObjects;

use InvalidArgumentException;

final class TaxId
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        if (! preg_match('/^\d{13}$/', $value)) {
            throw new InvalidArgumentException('Invalid tax ID: must be 13 digits.');
        }

        return new self($value);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
