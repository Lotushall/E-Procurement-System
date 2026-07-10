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
