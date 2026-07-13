<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an authenticated user can logout', function () {
    $user = UserModel::factory()->create();
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/auth/logout');

    $response->assertOk()
        ->assertJson(['message' => 'Logout successful.']);

    $this->assertGuest('web');
});

test('logout requires authentication', function () {
    $response = $this->postJson('/api/v1/auth/logout');

    $response->assertStatus(401);
});
