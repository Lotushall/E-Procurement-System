<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('setting a vendor document back to pending requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/documents/1/pending');

    $response->assertStatus(401);
});

test('an internal user can send an approved vendor document back to pending', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->approved()->create(['vendor_profile_id' => $profile->id]);

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/{$document->id}/pending");

    $response->assertOk()->assertJsonPath('data.document.0.status', 'pending');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'pending',
        'verified_by' => null,
    ]);
});

test('setting a nonexistent vendor document back to pending returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/documents/99999/pending");

    $response->assertStatus(404);
});
