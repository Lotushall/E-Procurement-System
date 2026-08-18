<?php

use App\Modules\User\Application\UseCases\DeleteRoleUseCase;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('execute deletes a role with no users assigned', function () {
    $role = Role::create(['name' => 'unused_role', 'guard_name' => 'web']);

    $result = app(DeleteRoleUseCase::class)->execute($role->id);

    expect($result)->toBeNull();
    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

test('execute returns an error message instead of deleting when the role still has users', function () {
    $role = Role::create(['name' => 'procurement_officer', 'guard_name' => 'web']);
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->assignRole($role);

    $result = app(DeleteRoleUseCase::class)->execute($role->id);

    expect($result)->toBe('ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้');
    $this->assertDatabaseHas('roles', ['id' => $role->id]);
});

test('execute throws when the role does not exist', function () {
    app(DeleteRoleUseCase::class)->execute(999999);
})->throws(ModelNotFoundException::class);

test('execute returns an error message instead of deleting the admin role even when it has no users', function () {
    $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

    $result = app(DeleteRoleUseCase::class)->execute($role->id);

    expect($result)->toBe('ไม่สามารถลบ role admin ได้');
    $this->assertDatabaseHas('roles', ['id' => $role->id]);
});
