<?php

use App\Modules\Shared\Domain\ValueObjects\Email;

test('creates an email from a valid address, trimmed and lowercased', function () {
    $email = Email::fromString('  User@Example.COM  ');

    expect($email->value)->toBe('user@example.com')
        ->and((string) $email)->toBe('user@example.com');
});

test('rejects an invalid email address', function () {
    Email::fromString('not-an-email');
})->throws(InvalidArgumentException::class);

test('equals returns true for two emails with the same value', function () {
    $a = Email::fromString('User@Example.com');
    $b = Email::fromString('user@example.com');

    expect($a->equals($b))->toBeTrue();
});

test('equals returns false for two emails with different values', function () {
    $a = Email::fromString('user@example.com');
    $b = Email::fromString('other@example.com');

    expect($a->equals($b))->toBeFalse();
});
