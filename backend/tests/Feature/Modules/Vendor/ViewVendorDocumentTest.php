<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('a vendor can view their own document', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $file = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf');
    $filePath = $file->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    $this->actingAs($user, 'web');

    $response = $this->get("/api/v1/vendor/document/{$document->id()}/view");

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/pdf');
    expect($response->streamedContent())->toBe(Storage::disk('local')->get($filePath));
});

test('viewing vendor document requires authentication', function () {
    $response = $this->get('/api/v1/vendor/document/1/view');

    $response->assertStatus(401);
});

test('a vendor cannot view another vendor document', function () {
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

    $response = $this->get("/api/v1/vendor/document/{$otherDocument->id()}/view");

    $response->assertStatus(500);
});
