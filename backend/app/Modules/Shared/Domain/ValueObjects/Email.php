<?php

namespace App\Modules\Shared\Domain\ValueObjects;

use InvalidArgumentException;

final class Email
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        $value = strtolower(trim($value));

        if (filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException("Invalid email address: {$value}");
        }

        return new self($value);
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
