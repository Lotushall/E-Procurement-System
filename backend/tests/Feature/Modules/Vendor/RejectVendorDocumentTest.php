<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rejecting a vendor document requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/documents/1/reject', ['remark' => 'Blurry image']);

    $response->assertStatus(401);
});

test('an internal user can reject a pending vendor document', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/reject", ['remark' => 'Blurry image']);

    $response->assertOk()->assertJsonPath('data.document.0.status', 'rejected');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Blurry image',
    ]);
});

test('rejecting a vendor document requires a remark', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/reject", []);

    $response->assertStatus(422)->assertJsonValidationErrors('remark');
});

test('rejecting a nonexistent vendor document returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/99999/reject", ['remark' => 'Blurry image']);

    $response->assertStatus(404);
});
