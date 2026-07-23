<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('a vendor can upload a document', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $this->actingAs($user, 'web');

    $response = $this->post('/api/v1/vendor/document', [
        'documentType' => 'company_registration',
        'file' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
    ]);

    $response->assertOk();

    $this->assertDatabaseHas('vendor_documents', [
        'vendor_profile_id' => $profile->id(),
        'document_type' => 'company_registration',
        'file_name' => 'registration.pdf',
        'status' => 'pending',
    ]);
});

test('uploading a vendor document requires authentication', function () {
    $response = $this->post('/api/v1/vendor/document', [
        'documentType' => 'company_registration',
        'file' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
    ], ['Accept' => 'application/json']);

    $response->assertStatus(401);
});

test('the uploaded file must be a supported document type', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $this->actingAs($user, 'web');

    $response = $this->post('/api/v1/vendor/document', [
        'documentType' => 'company_registration',
        'file' => UploadedFile::fake()->create('malware.exe', 100),
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('file');
});
