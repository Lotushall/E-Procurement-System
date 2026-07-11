<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Domain\States\UserStatus\Pending;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('save persists a newly registered user and returns it reconstituted with an id', function () {
    $repository = new UserRepository;
    $user = User::register('jdoe', Email::fromString('jdoe@example.com'), 'hashed-password', UserType::Internal);

    $saved = $repository->save($user);

    expect($saved->id())->not->toBeNull()
        ->and($saved->username())->toBe('jdoe')
        ->and($saved->email()->value)->toBe('jdoe@example.com')
        ->and($saved->userType())->toBe(UserType::Internal)
        ->and($saved->status())->toBeInstanceOf(Pending::class);

    $this->assertDatabaseHas('users', [
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
        'user_type' => 'internal',
        'status' => 'pending',
    ]);
});

test('save persists changes to an already-saved user', function () {
    $repository = new UserRepository;
    $user = User::register('jdoe', Email::fromString('jdoe@example.com'), 'hashed-password', UserType::Internal);
    $saved = $repository->save($user);

    $saved->activate();
    $updated = $repository->save($saved);

    expect($updated->id())->toBe($saved->id())
        ->and($updated->status())->toBeInstanceOf(Active::class);

    $this->assertDatabaseHas('users', [
        'id' => $saved->id(),
        'status' => 'active',
    ]);
});
