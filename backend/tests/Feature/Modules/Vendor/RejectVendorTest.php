<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rejecting a vendor requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/reject', ['remark' => 'Missing documents']);

    $response->assertStatus(401);
});

test('an internal user can reject a pending vendor', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/reject", ['remark' => 'Missing documents']);

    $response->assertOk()
        ->assertJsonPath('data.verificationStatus', 'rejected')
        ->assertJsonPath('data.remark', 'Missing documents');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'verified_by' => $internalUser->id,
    ]);
});

test('rejecting a vendor requires a remark', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/reject", []);

    $response->assertStatus(422)->assertJsonValidationErrors('remark');
});

test('rejecting a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->postJson('/api/v1/vendors/99999/reject', ['remark' => 'Missing documents']);

    $response->assertStatus(404);
});
