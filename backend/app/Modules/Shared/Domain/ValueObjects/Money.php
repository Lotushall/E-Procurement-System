<?php

namespace App\Modules\Shared\Domain\ValueObjects;

use InvalidArgumentException;

final class Money
{
    private function __construct(
        public readonly string $amount,
    ) {}

    public static function fromString(string $amount): self
    {
        if (! preg_match('/^\d+(\.\d{1,2})?$/', trim($amount))) {
            throw new InvalidArgumentException("Invalid money amount: {$amount}");
        }

        return new self(number_format((float) $amount, 2, '.', ''));
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount;
    }

    public function __toString(): string
    {
        return $this->amount;
    }
}
