<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Domain\States\UserStatus\Inactive;
use App\Modules\User\Domain\States\UserStatus\Pending;
use App\Modules\User\Domain\States\UserStatus\Suspended;
use Carbon\CarbonImmutable;

test('register creates a pending, unverified user', function () {
    $email = Email::fromString('user@example.com');

    $user = User::register('jdoe', $email, 'hashed-password', UserType::Internal);

    expect($user->id())->toBeNull()
        ->and($user->username())->toBe('jdoe')
        ->and($user->email())->toBe($email)
        ->and($user->passwordHash())->toBe('hashed-password')
        ->and($user->userType())->toBe(UserType::Internal)
        ->and($user->status())->toBeInstanceOf(Pending::class)
        ->and($user->isPending())->toBeTrue()
        ->and($user->isVerified())->toBeFalse()
        ->and($user->createdAt())->toBeNull()
        ->and($user->updatedAt())->toBeNull();
});

test('reconstitute rebuilds a user from persisted values', function () {
    $email = Email::fromString('user@example.com');
    $status = new Active(null);
    $emailVerifiedAt = CarbonImmutable::parse('2026-07-10 10:00:00');
    $createdAt = CarbonImmutable::parse('2026-07-01 09:00:00');
    $updatedAt = CarbonImmutable::parse('2026-07-05 09:00:00');

    $user = User::reconstitute(
        id: 1,
        username: 'jdoe',
        email: $email,
        passwordHash: 'hashed-password',
        userType: UserType::Internal,
        status: $status,
        emailVerifiedAt: $emailVerifiedAt,
        lastLoginAt: null,
        passwordChangedAt: null,
        createdAt: $createdAt,
        updatedAt: $updatedAt,
    );

    expect($user->id())->toBe(1)
        ->and($user->username())->toBe('jdoe')
        ->and($user->email())->toBe($email)
        ->and($user->passwordHash())->toBe('hashed-password')
        ->and($user->userType())->toBe(UserType::Internal)
        ->and($user->status())->toBe($status)
        ->and($user->emailVerifiedAt())->toBe($emailVerifiedAt)
        ->and($user->createdAt())->toBe($createdAt)
        ->and($user->updatedAt())->toBe($updatedAt);
});

test('activate transitions a pending user to active and touches updatedAt', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);

    $user->activate();

    expect($user->status())->toBeInstanceOf(Active::class)
        ->and($user->isActive())->toBeTrue()
        ->and($user->updatedAt())->not->toBeNull();
});

test('activate is a no-op when already active', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);
    $user->activate();
    $activeState = $user->status();

    $user->activate();

    expect($user->status())->toBe($activeState);
});

test('suspend transitions an active user to suspended', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);
    $user->activate();

    $user->suspend();

    expect($user->status())->toBeInstanceOf(Suspended::class);
});

test('deactivate transitions a user to inactive', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);
    $user->activate();

    $user->deactivate();

    expect($user->status())->toBeInstanceOf(Inactive::class);
});

test('verifyEmail sets emailVerifiedAt when not yet verified', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);

    $user->verifyEmail();

    expect($user->isVerified())->toBeTrue()
        ->and($user->emailVerifiedAt())->not->toBeNull();
});

test('verifyEmail throws when already verified', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);
    $user->verifyEmail();

    $user->verifyEmail();
})->throws(DomainException::class, 'Email has already been verified.');

test('changeEmail replaces the email and resets verification', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);
    $user->verifyEmail();
    $newEmail = Email::fromString('new@example.com');

    $user->changeEmail($newEmail);

    expect($user->email())->toBe($newEmail)
        ->and($user->isVerified())->toBeFalse();
});

test('changeEmail is a no-op when given the same email', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);
    $user->verifyEmail();

    $user->changeEmail(Email::fromString('user@example.com'));

    expect($user->isVerified())->toBeTrue();
});

test('changeUsername replaces the username', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);

    $user->changeUsername('jdoe2');

    expect($user->username())->toBe('jdoe2');
});

test('changePassword replaces the stored password hash', function () {
    $user = User::register('jdoe', Email::fromString('user@example.com'), 'hashed-password', UserType::Internal);

    $user->changePassword('new-hashed-password');

    expect($user->passwordHash())->toBe('new-hashed-password');
});
