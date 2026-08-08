<?php

use App\Modules\Vendor\Application\UseCases\PendingVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function pendingVendorDocumentUseCase(): PendingVendorDocumentUseCase
{
    return app(PendingVendorDocumentUseCase::class);
}

test('execute sends an approved vendor document back to pending and clears verification', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->approved()->create(['vendor_profile_id' => $profile->id]);

    pendingVendorDocumentUseCase()->execute($profile->id, $document->id);

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'pending',
        'verified_by' => null,
        'verified_at' => null,
        'remark' => null,
    ]);
});

test('execute sends a rejected vendor document back to pending and clears verification', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->rejected()->create(['vendor_profile_id' => $profile->id]);

    pendingVendorDocumentUseCase()->execute($profile->id, $document->id);

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'pending',
        'verified_by' => null,
        'verified_at' => null,
        'remark' => null,
    ]);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->approved()->create(['vendor_profile_id' => $otherProfile->id]);

    expect(fn () => pendingVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id))
        ->toThrow(ModelNotFoundException::class);
});
