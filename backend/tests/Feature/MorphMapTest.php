<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('the User model resolves to the "user" morph alias', function () {
    expect((new User)->getMorphClass())->toBe('user');
});

test('assigning a role persists the aliased morph type, not the raw class name', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'admin']);

    $user->assignRole($role);

    $this->assertDatabaseHas('model_has_roles', [
        'model_type' => 'user',
        'model_id' => $user->id,
    ]);
    $this->assertDatabaseMissing('model_has_roles', [
        'model_type' => User::class,
    ]);
});
