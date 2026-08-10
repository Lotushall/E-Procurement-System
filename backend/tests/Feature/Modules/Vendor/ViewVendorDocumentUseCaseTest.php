<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Profile\UseCases\ViewVendorDocumentUseCase;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function viewVendorDocumentUseCase(): ViewVendorDocumentUseCase
{
    return app(ViewVendorDocumentUseCase::class);
}

test('execute returns the document owned by the vendor profile', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $filePath = UploadedFile::fake()->createWithContent('registration.pdf', "%PDF-1.4\n")
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    $result = viewVendorDocumentUseCase()->execute($profile->id(), $document->id());

    expect($result->id())->toBe($document->id());
    expect($result->filePath())->toBe($filePath);
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

    expect(fn () => viewVendorDocumentUseCase()->execute($ownerProfile->id(), $otherDocument->id()))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the document id does not exist', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    expect(fn () => viewVendorDocumentUseCase()->execute($profile->id(), 999999))
        ->toThrow(ModelNotFoundException::class);
});

test('execute returns any vendor document when no vendor profile id is given', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $filePath = UploadedFile::fake()->createWithContent('registration.pdf', "%PDF-1.4\n")
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    $result = viewVendorDocumentUseCase()->execute(null, $document->id());

    expect($result->id())->toBe($document->id());
});

test('execute throws when no vendor profile id is given and the document id does not exist', function () {
    expect(fn () => viewVendorDocumentUseCase()->execute(null, 999999))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the stored file content does not match an allowed type', function () {
    Storage::fake('local');
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $filePath = UploadedFile::fake()->createWithContent('registration.pdf', '<html><script>alert(1)</script></html>')
        ->store("vendor-documents/{$profile->id()}", 'local');

    $document = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'company_registration',
        fileName: 'registration.pdf',
        filePath: $filePath,
    ));

    expect(fn () => viewVendorDocumentUseCase()->execute($profile->id(), $document->id()))
        ->toThrow(DomainException::class);
});
