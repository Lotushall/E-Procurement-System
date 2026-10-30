<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('an internal user with any TOR view permission may list TORs', function (string $permission) {
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tors.index'))->toBeTrue();
})->with([
    'tors.viewAny',
    'tors.viewDepartment',
    'tors.viewOwn',
]);

test('an internal user without a TOR view permission may not list TORs', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    expect(Gate::forUser($user)->allows('tors.index'))->toBeFalse();
});

test('a vendor user may not list TORs even when granted tors.viewAny', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.viewAny', 'guard_name' => 'web']));

    expect(Gate::forUser($user)->allows('tors.index'))->toBeFalse();
});
