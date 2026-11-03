<?php

namespace App\Modules\Vendor\Domain\ValueObjects;

use App\Shared\Support\ThaiIdNumber;
use InvalidArgumentException;

final class TaxId
{
    private function __construct(
        public readonly string $value,
    ) {}

    /**
     * A tax ID entered now: 13 digits with a correct check digit.
     */
    public static function fromString(string $value): self
    {
        if (! ThaiIdNumber::hasValidFormat($value)) {
            throw new InvalidArgumentException('Invalid tax ID: must be 13 digits.');
        }

        if (! ThaiIdNumber::isValid($value)) {
            throw new InvalidArgumentException('Invalid tax ID: the check digit does not match.');
        }

        return new self($value);
    }

    /**
     * A tax ID already stored. Rows saved before the check digit was enforced
     * may fail it, and must still load.
     */
    public static function fromPersisted(string $value): self
    {
        if (! ThaiIdNumber::hasValidFormat($value)) {
            throw new InvalidArgumentException('Invalid tax ID: must be 13 digits.');
        }

        return new self($value);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
