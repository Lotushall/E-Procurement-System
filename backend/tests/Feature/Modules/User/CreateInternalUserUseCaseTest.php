<?php

use App\Modules\Auth\Application\DTOs\LoginData;
use App\Modules\Auth\Application\UseCases\LoginUseCase;
use App\Modules\User\Application\DTOs\CreateInternalUserData;
use App\Modules\User\Application\UseCases\CreateInternalUserUseCase;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createInternalUserUseCase(): CreateInternalUserUseCase
{
    return app(CreateInternalUserUseCase::class);
}

function internalUserData(array $overrides = []): CreateInternalUserData
{
    return CreateInternalUserData::from(array_merge([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
        'password' => 'super-secret',
        'role' => 'admin',
        'firstname' => 'Jane',
        'lastname' => 'Doe',
    ], $overrides));
}

test('execute creates an active, verified internal user with an internal profile', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    $user = createInternalUserUseCase()->execute(internalUserData());

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

test('execute saves the optional internal profile fields', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    createInternalUserUseCase()->execute(internalUserData([
        'employeeNo' => 'EMP-001',
        'prefix' => 'Mr.',
        'department' => 'IT',
        'position' => 'Manager',
        'phone' => '0812345678',
    ]));

    $this->assertDatabaseHas('internal_profiles', [
        'employee_no' => 'EMP-001',
        'prefix' => 'Mr.',
        'department' => 'IT',
        'position' => 'Manager',
        'phone' => '0812345678',
    ]);
});

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
