<?php

namespace App\Shared\Support;

use RuntimeException;

/**
 * Deterministic lookup hash for an encrypted identification number (citizen
 * ID, tax ID). The number itself is stored encrypted, which cannot be queried,
 * so its hash backs lookups and unique indexes.
 *
 * The hash is keyed (HMAC) because a 13-digit number with a check digit has
 * only about 10^12 possible values: a plain hash could be reversed by trying
 * them all. Without IDENTITY_HASH_KEY the hash cannot be reversed. Changing
 * the key changes every hash, so stored hashes must then be recomputed.
 */
final class IdentityHash
{
    public static function make(string $identificationNumber): string
    {
        return hash_hmac('sha256', $identificationNumber, self::key());
    }

    private static function key(): string
    {
        $key = (string) config('app.identity_hash_key');

        if ($key === '') {
            throw new RuntimeException('IDENTITY_HASH_KEY is not set. Generate one with: php -r "echo base64_encode(random_bytes(32));"');
        }

        return $key;
    }
}
