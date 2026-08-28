<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Domain\States\UserStatus\Pending;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
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

test('findByUsername returns the domain user matching the given username', function () {
    $repository = new UserRepository;
    $user = User::register('jdoe', Email::fromString('jdoe@example.com'), 'hashed-password', UserType::Internal);
    $repository->save($user);

    $found = $repository->findByUsername('jdoe');

    expect($found)->not->toBeNull()
        ->and($found->username())->toBe('jdoe')
        ->and($found->email()->value)->toBe('jdoe@example.com');
});

test('findByUsername returns null when no user matches', function () {
    $repository = new UserRepository;

    expect($repository->findByUsername('missing'))->toBeNull();
});

test('delete soft-deletes the user and excludes them from default queries', function () {
    $repository = new UserRepository;
    $user = User::register('todelete', Email::fromString('todelete@example.com'), 'hashed-password', UserType::Internal);
    $saved = $repository->save($user);

    $repository->delete($saved->id());

    $this->assertSoftDeleted('users', ['id' => $saved->id()]);
    expect($repository->findByUsername('todelete'))->toBeNull();
});

test('delete throws when the user does not exist', function () {
    $repository = new UserRepository;

    $repository->delete(999999);
})->throws(ModelNotFoundException::class);

test('delete mutates the username and email so the originals become free to reuse', function () {
    $repository = new UserRepository;
    $user = User::register('todelete', Email::fromString('todelete@example.com'), 'hashed-password', UserType::Internal);
    $saved = $repository->save($user);

    $repository->delete($saved->id());

    $this->assertDatabaseMissing('users', ['id' => $saved->id(), 'username' => 'todelete']);
    $this->assertDatabaseMissing('users', ['id' => $saved->id(), 'email' => 'todelete@example.com']);

    $newUser = User::register('todelete', Email::fromString('todelete@example.com'), 'hashed-password', UserType::Internal);
    $newSaved = $repository->save($newUser);

    expect($newSaved->id())->not->toBe($saved->id())
        ->and($newSaved->username())->toBe('todelete')
        ->and($newSaved->email()->value)->toBe('todelete@example.com');
});

test('findIdsDeletedBefore returns ids of users soft-deleted at or before the cutoff', function () {
    $repository = new UserRepository;

    $old = $repository->save(User::register('old', Email::fromString('old@example.com'), 'hashed-password', UserType::Internal));
    $repository->delete($old->id());
    UserModel::withTrashed()->whereKey($old->id())->update(['deleted_at' => CarbonImmutable::now()->subDays(31)]);

    $recent = $repository->save(User::register('recent', Email::fromString('recent@example.com'), 'hashed-password', UserType::Internal));
    $repository->delete($recent->id());

    $repository->save(User::register('active', Email::fromString('active@example.com'), 'hashed-password', UserType::Internal));

    $ids = $repository->findIdsDeletedBefore(CarbonImmutable::now()->subDays(30));

    expect($ids)->toBe([$old->id()]);
});

test('forceDelete permanently removes a soft-deleted user', function () {
    $repository = new UserRepository;
    $user = $repository->save(User::register('todelete', Email::fromString('todelete@example.com'), 'hashed-password', UserType::Internal));
    $repository->delete($user->id());

    $repository->forceDelete($user->id());

    expect(UserModel::withTrashed()->find($user->id()))->toBeNull();
});

test('forceDelete throws when the user does not exist', function () {
    $repository = new UserRepository;

    $repository->forceDelete(999999);
})->throws(ModelNotFoundException::class);
