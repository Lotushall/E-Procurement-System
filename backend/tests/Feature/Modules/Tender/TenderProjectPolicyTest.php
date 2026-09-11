<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('an internal user with the tender_projects.create permission is authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeTrue();
});

test('an internal user without the permission is not authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});

test('a non-internal user is not authorized even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});

test('an internal user with the tender_projects.viewAny permission is authorized to list', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeTrue();
});

test('an internal user without the viewAny permission is not authorized to list', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeFalse();
});

test('a non-internal user is not authorized to list even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeFalse();
});

test('an internal user with the tender_projects.delete permission is authorized to delete', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.delete', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.destroy'))->toBeTrue();
});

test('an internal user without the delete permission is not authorized to delete', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.destroy'))->toBeFalse();
});

test('a non-internal user is not authorized to delete even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.delete', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.destroy'))->toBeFalse();
});

test('an internal user with the tender_projects.update permission is authorized to update', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.update', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.update'))->toBeTrue();
});

test('an internal user without the update permission is not authorized to update', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.update'))->toBeFalse();
});

test('a non-internal user is not authorized to update even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.update', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.update'))->toBeFalse();
});

test('an internal user with the tender_projects.updateStatus permission is authorized to change status', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.updateStatus', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.updateStatus'))->toBeTrue();
});

test('an internal user without the updateStatus permission is not authorized to change status', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.updateStatus'))->toBeFalse();
});

test('a non-internal user is not authorized to change status even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.updateStatus', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.updateStatus'))->toBeFalse();
});
