<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('a vendor can delete their document', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $filePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/vendor/document/{$document->id()}");

    $response->assertOk()->assertJsonPath('data.document', []);

    $this->assertDatabaseMissing('vendor_documents', ['id' => $document->id()]);
    Storage::disk('local')->assertMissing($filePath);
});

test('deleting vendor document requires authentication', function () {
    $response = $this->deleteJson('/api/v1/vendor/document/1');

    $response->assertStatus(401);
});

test('a vendor cannot delete another vendor document', function () {
    Storage::fake('local');
    $ownerUser = User::factory()->create(['user_type' => 'company']);
    $otherUser = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $repository->saveProfile(VendorProfile::create(userId: $ownerUser->id));
    $otherProfile = $repository->saveProfile(VendorProfile::create(userId: $otherUser->id));

    $otherFilePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$otherProfile->id()}", 'local');

    $otherDocument = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $otherProfile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $otherFilePath,
    ));

    $this->actingAs($ownerUser, 'web');

    $response = $this->deleteJson("/api/v1/vendor/document/{$otherDocument->id()}");

    $response->assertStatus(500);

    $this->assertDatabaseHas('vendor_documents', ['id' => $otherDocument->id()]);
    Storage::disk('local')->assertExists($otherFilePath);
});
