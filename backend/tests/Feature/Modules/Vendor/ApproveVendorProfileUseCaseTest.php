<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileApprovedNotification;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function approveVendorProfileUseCase(): ApproveVendorProfileUseCase
{
    return app(ApproveVendorProfileUseCase::class);
}

test('execute approves a pending vendor profile', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Looks good');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
        'remark' => 'Looks good',
    ]);
});

test('execute approves a rejected vendor profile', function () {
    $profile = VendorProfiles::factory()->rejected()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
        'remark' => null,
    ]);
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorProfileUseCase()->execute(999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});

test('execute notifies the profile owner with mail enabled by default', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileApprovedNotification::class,
        fn ($notification, $channels) => in_array('mail', $channels, true)
    );
});

test('execute notifies the profile owner without mail when sendEmail is false', function () {
    Notification::fake();
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id, null, false);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileApprovedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});
