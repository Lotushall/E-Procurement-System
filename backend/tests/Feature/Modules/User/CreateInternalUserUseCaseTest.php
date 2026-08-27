<?php

use App\Modules\Auth\Application\DTOs\LoginData;
use App\Modules\Auth\Application\UseCases\LoginUseCase;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Application\DTOs\CreateInternalUserData;
use App\Modules\User\Application\UseCases\CreateInternalUserUseCase;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createInternalUserUseCase(): CreateInternalUserUseCase
{
    return app(CreateInternalUserUseCase::class);
}

function unlinkedInternalProfile(array $overrides = []): InternalProfiles
{
    return InternalProfiles::create(array_merge([
        'firstname' => 'Jane',
        'lastname' => 'Doe',
    ], $overrides));
}

function internalUserData(array $overrides = []): CreateInternalUserData
{
    return CreateInternalUserData::from(array_merge([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
        'password' => 'super-secret',
        'role' => 'admin',
        'internalProfileId' => unlinkedInternalProfile()->id,
    ], $overrides));
}

test('execute creates an active, verified internal user linked to the given internal profile', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $profile = unlinkedInternalProfile(['firstname' => 'Jane', 'lastname' => 'Doe']);

    $user = createInternalUserUseCase()->execute(internalUserData(['internalProfileId' => $profile->id]));

    expect($user->userType())->toBe(UserType::Internal)
        ->and($user->status())->toBeInstanceOf(Active::class)
        ->and($user->isVerified())->toBeTrue();

    $this->assertDatabaseHas('users', [
        'id' => $user->id(),
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
        'user_type' => 'internal',
        'status' => 'active',
    ]);

    $this->assertDatabaseHas('internal_profiles', [
        'id' => $profile->id,
        'user_id' => $user->id(),
        'firstname' => 'Jane',
        'lastname' => 'Doe',
    ]);
});

test('execute assigns the given role to the created user', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    $user = createInternalUserUseCase()->execute(internalUserData());

    expect(UserModel::find($user->id())->hasRole('admin'))->toBeTrue();
});

test('execute syncs the given direct permissions to the created user', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);

    $user = createInternalUserUseCase()->execute(internalUserData([
        'permissions' => ['vendors.view'],
    ]));

    expect(UserModel::find($user->id())->hasDirectPermission('vendors.view'))->toBeTrue();
});

test('execute throws when the internal profile does not exist', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    createInternalUserUseCase()->execute(internalUserData(['internalProfileId' => 999999]));
})->throws(ModelNotFoundException::class);

test('execute throws when the internal profile is already linked to another user', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $existingUser = UserModel::factory()->create(['user_type' => 'internal']);
    $linkedProfile = unlinkedInternalProfile(['user_id' => $existingUser->id]);

    createInternalUserUseCase()->execute(internalUserData(['internalProfileId' => $linkedProfile->id]));
})->throws(DomainException::class);

test('a newly created internal user can log in immediately', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    createInternalUserUseCase()->execute(internalUserData());

    $loggedInUser = app(LoginUseCase::class)->execute(new LoginData(
        identifier: 'jdoe@example.com',
        identifierField: 'email',
        password: 'super-secret',
        remember: false,
    ));

    expect($loggedInUser->username())->toBe('jdoe');
});
