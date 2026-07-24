<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\UseCases\SaveVendorDocumentUseCase;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function saveVendorDocumentUseCase(): SaveVendorDocumentUseCase
{
    return app(SaveVendorDocumentUseCase::class);
}

test('execute stores a new document as pending', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    saveVendorDocumentUseCase()->execute($profile->id(), UpdateVendorDocumentData::from([
        'documentType' => 'company_registration',
        'file' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
    ]));

    $this->assertDatabaseHas('vendor_documents', [
        'vendor_profile_id' => $profile->id(),
        'document_type' => 'company_registration',
        'file_name' => 'registration.pdf',
        'status' => 'pending',
    ]);

    $document = $repository->findDocumentByVendorProfileIdAndType($profile->id(), 'company_registration');
    Storage::disk('local')->assertExists($document->filePath());
});

test('execute reuploads and replaces an existing document of the same type', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $originalPath = UploadedFile::fake()->create('registration-v1.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$profile->id()}", 'local');

    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration-v1.pdf',
        filePath: $originalPath,
    ));

    saveVendorDocumentUseCase()->execute($profile->id(), UpdateVendorDocumentData::from([
        'documentType' => 'company_registration',
        'file' => UploadedFile::fake()->create('registration-v2.pdf', 100, 'application/pdf'),
    ]));

    $this->assertDatabaseCount('vendor_documents', 1);

    $this->assertDatabaseHas('vendor_documents', [
        'vendor_profile_id' => $profile->id(),
        'document_type' => 'company_registration',
        'file_name' => 'registration-v2.pdf',
        'status' => 'pending',
    ]);

    Storage::disk('local')->assertMissing($originalPath);
});

test('execute resubmits an approved vendor profile back to pending after a document change', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $profile->approve(verifiedBy: $user->id);
    $repository->saveProfile($profile);

    saveVendorDocumentUseCase()->execute($profile->id(), UpdateVendorDocumentData::from([
        'documentType' => 'company_registration',
        'file' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
    ]));

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id(),
        'verification_status' => 'pending',
    ]);
});

test('execute does not error when the vendor profile is already pending', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    saveVendorDocumentUseCase()->execute($profile->id(), UpdateVendorDocumentData::from([
        'documentType' => 'company_registration',
        'file' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
    ]));

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id(),
        'verification_status' => 'pending',
    ]);
});
