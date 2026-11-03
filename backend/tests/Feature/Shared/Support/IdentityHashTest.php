<?php

use App\Shared\Support\IdentityHash;

test('make returns a keyed HMAC, not a plain hash of the number', function () {
    config(['app.identity_hash_key' => 'key-one']);

    expect(IdentityHash::make('1101700230708'))
        ->toBe(hash_hmac('sha256', '1101700230708', 'key-one'))
        ->not->toBe(hash('sha256', '1101700230708'));
});

test('make is deterministic for the same key and differs between keys', function () {
    config(['app.identity_hash_key' => 'key-one']);
    $first = IdentityHash::make('1101700230708');
    $again = IdentityHash::make('1101700230708');

    config(['app.identity_hash_key' => 'key-two']);
    $otherKey = IdentityHash::make('1101700230708');

    expect($again)->toBe($first)
        ->and($otherKey)->not->toBe($first);
});

test('make refuses to hash without a key', function (?string $key) {
    config(['app.identity_hash_key' => $key]);

    IdentityHash::make('1101700230708');
})->with([
    'missing' => [null],
    'empty' => [''],
])->throws(RuntimeException::class, 'IDENTITY_HASH_KEY is not set.');
