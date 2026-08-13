<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('setting a vendor back to pending requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/pending');

    $response->assertStatus(401);
});

test('an internal user can send an approved vendor back to pending', function () {
    $internalUser = User::factory()->internal()->create();
    $profile = VendorProfiles::factory()->approved()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/pending");

    $response->assertOk()->assertJsonPath('data.verificationStatus', 'pending');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'pending',
        'verified_by' => null,
    ]);
});

test('a vendor user cannot send a vendor back to pending', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->approved()->create();

    $this->actingAs($vendorUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/pending");

    $response->assertStatus(403);
});

test('setting a nonexistent vendor back to pending returns 404', function () {
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->postJson('/api/v1/vendors/99999/pending');

    $response->assertStatus(404);
});
