<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('running the admin seeder creates an admin user', function () {
    (new AdminUserSeeder)->run();

    $this->assertDatabaseHas('users', [
        'email' => 'admin@example.com',
        'username' => 'admin',
    ]);
    $user = User::where('email', 'admin@example.com')->first();
    $this->assertTrue($user->hasRole('admin'));
});

test('running the admin seeder links an internal profile to the user', function () {
    (new AdminUserSeeder)->run();

    $user = User::where('email', 'admin@example.com')->first();
    $profile = InternalProfiles::where('user_id', $user->id)->first();

    $this->assertNotNull($profile);
    $this->assertEquals('System', $profile->firstname);
    $this->assertEquals('Administrator', $profile->lastname);
});

test('running the admin seeder twice does not create a duplicate admin user', function () {
    (new AdminUserSeeder)->run();
    (new AdminUserSeeder)->run();

    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('internal_profiles', 1);
});
