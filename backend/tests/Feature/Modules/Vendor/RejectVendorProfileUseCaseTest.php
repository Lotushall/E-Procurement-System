<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileRejectedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function rejectVendorProfileUseCase(): RejectVendorProfileUseCase
{
    return app(RejectVendorProfileUseCase::class);
}

test('execute rejects a pending vendor profile', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Missing documents');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Missing documents',
    ]);
});

test('execute rejects an approved vendor profile', function () {
    $profile = VendorProfiles::factory()->approved()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Revoked');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'remark' => 'Revoked',
    ]);
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorProfileUseCase()->execute(999999, $internalUser->id, 'Missing documents'))
        ->toThrow(ModelNotFoundException::class);
});

test('execute notifies the profile owner with mail enabled by default', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Missing documents');

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileRejectedNotification::class,
        fn ($notification, $channels) => in_array('mail', $channels, true)
    );
});

test('execute notifies the profile owner without mail when sendEmail is false', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Missing documents', false);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileRejectedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
