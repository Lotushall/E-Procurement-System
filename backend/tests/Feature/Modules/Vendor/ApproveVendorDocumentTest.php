<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('approving a vendor document requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/documents/1/approve');

    $response->assertStatus(401);
});

test('an internal user can approve a pending vendor document', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/approve");

    $response->assertOk()->assertJsonPath('data.document.0.status', 'approved');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('approving a nonexistent vendor document returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/99999/approve");

    $response->assertStatus(404);
});

test('a vendor user cannot approve a vendor document', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($vendorUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/approve");

    $response->assertStatus(403);
});
