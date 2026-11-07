<?php

namespace App\Modules\Tender\Domain\ValueObjects\Tor;

use InvalidArgumentException;

final class TorCode
{
    private function __construct(
        public readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        $value = trim($value);

        if ($value === '') {
            throw new InvalidArgumentException('Invalid TOR code: must not be blank.');
        }

        if (mb_strlen($value) > 255) {
            throw new InvalidArgumentException('Invalid TOR code: must not exceed 255 characters.');
        }

        return new self($value);
    }

    /**
     * The code issued for a sequence number of the calendar year the TOR is
     * created in, e.g. TOR-2026-0001.
     */
    public static function forSequence(int $year, int $sequence): self
    {
        return self::fromString(sprintf('TOR-%d-%04d', $year, $sequence));
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
