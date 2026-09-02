<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('an internal user with the tender-projects.create permission is authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeTrue();
});

test('an internal user without the permission is not authorized', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});

test('a non-internal user is not authorized even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.create', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.store'))->toBeFalse();
});

test('an internal user with the tender-projects.viewAny permission is authorized to list', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeTrue();
});

test('an internal user without the viewAny permission is not authorized to list', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeFalse();
});

test('a non-internal user is not authorized to list even when directly granted the permission', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender-projects.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tender-projects.index'))->toBeFalse();
});
