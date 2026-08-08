<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('approving a vendor requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/approve');

    $response->assertStatus(401);
});

test('an internal user can approve a pending vendor', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/approve", ['remark' => 'Looks good']);

    $response->assertOk()
        ->assertJsonPath('data.verificationStatus', 'approved')
        ->assertJsonPath('data.remark', 'Looks good');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('approving a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->postJson('/api/v1/vendors/99999/approve');

    $response->assertStatus(404);
});

test('a vendor user cannot approve a vendor', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($vendorUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/approve");

    $response->assertStatus(403);
});
