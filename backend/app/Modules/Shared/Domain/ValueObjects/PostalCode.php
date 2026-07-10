<?php

namespace App\Modules\Shared\Domain\ValueObjects;

use InvalidArgumentException;

final class PostalCode
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        if (! preg_match('/^\d{5}$/', $value)) {
            throw new InvalidArgumentException("Invalid postal code: {$value}");
        }

        return new self($value);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
