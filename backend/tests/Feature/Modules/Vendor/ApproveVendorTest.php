<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Notifications\VendorProfileApprovedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

test('approving a vendor requires authentication', function () {
    $response = $this->postJson('/api/v1/vendors/1/approve');

    $response->assertStatus(401);
});

test('an internal user can approve a pending vendor', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/approve", ['remark' => 'Looks good']);

    $response->assertOk()
        ->assertJsonPath('data.verificationStatus', 'approved')
        ->assertJsonPath('data.remark', 'Looks good');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
    ]);
});

test('approving a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($internalUser, 'web');

    $response = $this->postJson('/api/v1/vendors/99999/approve');

    $response->assertStatus(404);
});

test('a vendor user cannot approve a vendor', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($vendorUser, 'web');

    $response = $this->postJson("/api/v1/vendors/{$profile->id}/approve");

    $response->assertStatus(403);
});

test('approving a vendor without send_email skips the mail channel', function () {
    Notification::fake();
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $this->postJson("/api/v1/vendors/{$profile->id}/approve", ['send_email' => false]);

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileApprovedNotification::class,
        fn ($notification, $channels) => $channels === ['database']
    );
});

test('approving a vendor without specifying send_email defaults to sending mail', function () {
    Notification::fake();
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();

    $this->actingAs($internalUser, 'web');

    $this->postJson("/api/v1/vendors/{$profile->id}/approve");

    Notification::assertSentTo(
        $profile->VendorProfilesUser,
        VendorProfileApprovedNotification::class,
        fn ($notification, $channels) => in_array('mail', $channels, true)
    );
});
