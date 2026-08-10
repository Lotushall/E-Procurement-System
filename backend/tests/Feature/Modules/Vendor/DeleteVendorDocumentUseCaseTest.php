<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Profile\UseCases\DeleteVendorDocumentUseCase;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function deleteVendorDocumentUseCase(): DeleteVendorDocumentUseCase
{
    return app(DeleteVendorDocumentUseCase::class);
}

test('execute deletes the document and its file', function () {
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

    deleteVendorDocumentUseCase()->execute($profile->id(), $document->id());

    $this->assertDatabaseMissing('vendor_documents', ['id' => $document->id()]);
    Storage::disk('local')->assertMissing($filePath);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    Storage::fake('local');
    $ownerUser = User::factory()->create(['user_type' => 'company']);
    $otherUser = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $ownerProfile = $repository->saveProfile(VendorProfile::create(userId: $ownerUser->id));
    $otherProfile = $repository->saveProfile(VendorProfile::create(userId: $otherUser->id));

    $otherFilePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$otherProfile->id()}", 'local');

    $otherDocument = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $otherProfile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $otherFilePath,
    ));

    expect(fn () => deleteVendorDocumentUseCase()->execute($ownerProfile->id(), $otherDocument->id()))
        ->toThrow(ModelNotFoundException::class);

    $this->assertDatabaseHas('vendor_documents', ['id' => $otherDocument->id()]);
    Storage::disk('local')->assertExists($otherFilePath);
});

test('execute throws when the document id does not exist', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    expect(fn () => deleteVendorDocumentUseCase()->execute($profile->id(), 999999))
        ->toThrow(ModelNotFoundException::class);
});

test('execute resubmits an approved vendor profile back to pending after a document is deleted', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $profile->approve(verifiedBy: $user->id);
    $repository->saveProfile($profile);

    $filePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    deleteVendorDocumentUseCase()->execute($profile->id(), $document->id());

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

    $filePath = UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf')
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    deleteVendorDocumentUseCase()->execute($profile->id(), $document->id());

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id(),
        'verification_status' => 'pending',
    ]);
});
