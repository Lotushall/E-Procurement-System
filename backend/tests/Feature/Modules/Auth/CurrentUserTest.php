<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('an authenticated user can fetch their own profile with empty roles and permissions', function () {
    $user = UserModel::factory()->create([
        'username' => 'jdoe',
        'email' => 'jdoe@example.com',
    ]);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/auth/user');

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.username', 'jdoe')
        ->assertJsonPath('data.email', 'jdoe@example.com')
        ->assertJsonPath('data.userType', $user->user_type->value)
        ->assertJsonPath('data.roles', [])
        ->assertJsonPath('data.permissions', []);
});

test('an authenticated user sees their assigned roles and permissions', function () {
    $user = UserModel::factory()->create();
    $permission = Permission::create(['name' => 'users.view']);
    $role = Role::create(['name' => 'admin']);
    $role->givePermissionTo($permission);
    $user->assignRole($role);

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/auth/user');

    $response->assertOk()
        ->assertJsonPath('data.roles', ['admin'])
        ->assertJsonPath('data.permissions', ['users.view']);
});

test('a company vendor sees the company name of their vendor profile', function () {
    $user = UserModel::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->create(['user_id' => $user->id]);
    VendorCompanyDetails::factory()->create(['vendor_profile_id' => $profile->id, 'company_name' => 'Acme Co., Ltd.']);
    $this->actingAs($user, 'web');

    $this->getJson('/api/v1/auth/user')
        ->assertOk()
        ->assertJsonPath('data.profiles.companyName', 'Acme Co., Ltd.')
        ->assertJsonPath('data.profiles.shopName', null);
});

test('an individual vendor sees the store and personal names of their vendor profile', function () {
    $user = UserModel::factory()->create(['user_type' => 'individual']);
    $profile = VendorProfiles::factory()->create(['user_id' => $user->id]);
    VendorIndividualDetails::factory()->create([
        'vendor_profile_id' => $profile->id,
        'store_name' => "John's Store",
        'firstname' => 'John',
        'lastname' => 'Doe',
    ]);
    $this->actingAs($user, 'web');

    $this->getJson('/api/v1/auth/user')
        ->assertOk()
        ->assertJsonPath('data.profiles.shopName', "John's Store")
        ->assertJsonPath('data.profiles.firstname', 'John')
        ->assertJsonPath('data.profiles.lastname', 'Doe')
        ->assertJsonPath('data.profiles.companyName', null);
});

test('a vendor without a vendor profile yet gets empty profile names', function () {
    $this->actingAs(UserModel::factory()->create(['user_type' => 'individual']), 'web');

    $this->getJson('/api/v1/auth/user')
        ->assertOk()
        ->assertJsonPath('data.profiles', [
            'companyName' => null,
            'shopName' => null,
            'firstname' => null,
            'lastname' => null,
        ]);
});

test('fetching the current user requires authentication', function () {
    $response = $this->getJson('/api/v1/auth/user');

    $response->assertStatus(401);
});
