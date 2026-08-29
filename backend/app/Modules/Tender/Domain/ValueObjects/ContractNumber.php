<?php

namespace App\Modules\Tender\Domain\ValueObjects;

use InvalidArgumentException;

final class ContractNumber
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        $value = trim($value);

        if ($value === '') {
            throw new InvalidArgumentException('Invalid contract number: must not be blank.');
        }

        if (mb_strlen($value) > 255) {
            throw new InvalidArgumentException('Invalid contract number: must not exceed 255 characters.');
        }

        return new self($value);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
