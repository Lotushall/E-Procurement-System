<?php

use App\Modules\User\Application\DTOs\UpdateInternalUserData;
use App\Modules\User\Application\UseCases\UpdateInternalUserUseCase;
use App\Modules\User\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function updateInternalUserData(array $overrides = []): UpdateInternalUserData
{
    return UpdateInternalUserData::from(array_merge([
        'username' => 'newname',
        'email' => 'newemail@example.com',
        'role' => 'staff',
        'firstname' => 'New',
        'lastname' => 'Name',
    ], $overrides));
}

test('execute updates account fields and internal profile fields for an existing profile', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $target = UserModel::factory()->create(['user_type' => 'internal', 'username' => 'oldname']);
    InternalProfiles::create([
        'user_id' => $target->id,
        'firstname' => 'Old',
        'lastname' => 'Name',
    ]);

    app(UpdateInternalUserUseCase::class)->execute($target->id, updateInternalUserData([
        'employeeNo' => 'EMP-999',
    ]));

    $this->assertDatabaseHas('users', ['id' => $target->id, 'username' => 'newname', 'email' => 'newemail@example.com']);
    $this->assertDatabaseHas('internal_profiles', [
        'user_id' => $target->id,
        'firstname' => 'New',
        'lastname' => 'Name',
        'employee_no' => 'EMP-999',
    ]);
});

test('execute creates an internal profile when the user has none yet', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $target = UserModel::factory()->create(['user_type' => 'internal']);

    app(UpdateInternalUserUseCase::class)->execute($target->id, updateInternalUserData());

    $this->assertDatabaseHas('internal_profiles', ['user_id' => $target->id, 'firstname' => 'New', 'lastname' => 'Name']);
});

test('execute replaces the role rather than accumulating it', function () {
    $oldRole = Role::firstOrCreate(['name' => 'viewer', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $target = UserModel::factory()->create(['user_type' => 'internal']);
    $target->assignRole($oldRole);

    app(UpdateInternalUserUseCase::class)->execute($target->id, updateInternalUserData());

    $fresh = $target->fresh();
    expect($fresh->hasRole('staff'))->toBeTrue()
        ->and($fresh->hasRole('viewer'))->toBeFalse();
});

test('execute syncs direct permissions', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'vendors.view', 'guard_name' => 'web']);
    $target = UserModel::factory()->create(['user_type' => 'internal']);

    app(UpdateInternalUserUseCase::class)->execute($target->id, updateInternalUserData([
        'permissions' => ['vendors.view'],
    ]));

    expect($target->fresh()->hasDirectPermission('vendors.view'))->toBeTrue();
});

test('execute changes the password when one is given', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
    $target = UserModel::factory()->create(['user_type' => 'internal']);

    app(UpdateInternalUserUseCase::class)->execute($target->id, updateInternalUserData(['password' => 'new-secret-1']));

    expect(Hash::check('new-secret-1', $target->fresh()->password))->toBeTrue();
});

test('execute throws when the user does not exist', function () {
    Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);

    app(UpdateInternalUserUseCase::class)->execute(999999, updateInternalUserData());
})->throws(ModelNotFoundException::class);
