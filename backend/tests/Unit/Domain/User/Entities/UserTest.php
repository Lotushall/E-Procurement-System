<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus\Pending;
use Carbon\CarbonImmutable;

test('holds the given values', function () {
    $email = Email::fromString('user@example.com');
    $status = new Pending(null);
    $emailVerifiedAt = CarbonImmutable::parse('2026-07-10 10:00:00');

    $user = new User(
        id: 1,
        username: 'jdoe',
        email: $email,
        password: 'hashed-password',
        userType: UserType::Internal,
        status: $status,
        emailVerifiedAt: $emailVerifiedAt,
    );

    expect($user->id)->toBe(1)
        ->and($user->username)->toBe('jdoe')
        ->and($user->email)->toBe($email)
        ->and($user->password)->toBe('hashed-password')
        ->and($user->userType)->toBe(UserType::Internal)
        ->and($user->status)->toBe($status)
        ->and($user->emailVerifiedAt)->toBe($emailVerifiedAt);
});
