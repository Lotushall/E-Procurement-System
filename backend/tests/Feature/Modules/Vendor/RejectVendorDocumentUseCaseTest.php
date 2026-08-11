<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorDocumentUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorDocumentRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function rejectVendorDocumentUseCase(): RejectVendorDocumentUseCase
{
    return app(RejectVendorDocumentUseCase::class);
}

test('execute rejects a pending vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, 'Blurry image');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Blurry image',
    ]);
});

test('execute rejects an approved vendor document', function () {
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->approved()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, 'Revoked');

    $this->assertDatabaseHas('vendor_documents', [
        'id' => $document->id,
        'status' => 'rejected',
        'remark' => 'Revoked',
    ]);
});

test('execute throws when the document does not belong to the vendor profile', function () {
    $ownerProfile = VendorProfiles::factory()->create();
    $otherProfile = VendorProfiles::factory()->create();
    $otherDocument = VendorDocuments::factory()->create(['vendor_profile_id' => $otherProfile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorDocumentUseCase()->execute($ownerProfile->id, $otherDocument->id, $internalUser->id, 'Blurry image'))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the document id does not exist', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorDocumentUseCase()->execute($profile->id, 999999, $internalUser->id, 'Blurry image'))
        ->toThrow(ModelNotFoundException::class);
});

test('execute notifies the profile owner with mail enabled by default', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, 'Blurry image');

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorDocumentRejectedNotification::class,
        fn ($notification, $channels) => in_array('mail', $channels, true)
    );
});

test('execute notifies the profile owner without mail when sendEmail is false', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $document = VendorDocuments::factory()->create(['vendor_profile_id' => $profile->id]);
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorDocumentUseCase()->execute($profile->id, $document->id, $internalUser->id, 'Blurry image', false);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorDocumentRejectedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
