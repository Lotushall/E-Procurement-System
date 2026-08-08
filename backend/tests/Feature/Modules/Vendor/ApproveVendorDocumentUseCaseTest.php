<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\ApproveVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function approveVendorDocumentUseCase(): ApproveVendorDocumentUseCase
{
    return app(ApproveVendorDocumentUseCase::class);
}

test('execute approves a pending vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id);

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('execute approves a rejected vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->rejected()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id);

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->create(['vendor_profile_id' => $otherProfile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the document id does not exist', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorDocumentUseCase()->execute($profile->id, 999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});
