<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a vendor can delete their contact', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $contact = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: false,
    ));

    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/vendor/contact/{$contact->id()}");

    $response->assertOk()->assertJsonPath('data.contact', []);

    $this->assertDatabaseMissing('vendor_contact', ['id' => $contact->id()]);
});

test('a vendor cannot delete their main contact', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $mainContact = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: true,
    ));

    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/vendor/contact/{$mainContact->id()}");

    $response->assertStatus(500);

    $this->assertDatabaseHas('vendor_contact', ['id' => $mainContact->id()]);
});

test('deleting vendor contact requires authentication', function () {
    $response = $this->deleteJson('/api/v1/vendor/contact/1');

    $response->assertStatus(401);
});

test('a vendor cannot delete another vendor contact', function () {
    $ownerUser = User::factory()->create(['user_type' => 'company']);
    $otherUser = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $repository->saveProfile(VendorProfile::create(userId: $ownerUser->id));
    $otherProfile = $repository->saveProfile(VendorProfile::create(userId: $otherUser->id));

    $otherContact = $repository->saveContact(VendorContact::create(
        vendorProfileId: $otherProfile->id(),
        contactName: 'Other Vendor Contact',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('other@company.com'),
        lineId: null,
        otherContact: null,
        isMainContact: true,
    ));

    $this->actingAs($ownerUser, 'web');

    $response = $this->deleteJson("/api/v1/vendor/contact/{$otherContact->id()}");

    $response->assertStatus(500);

    $this->assertDatabaseHas('vendor_contact', ['id' => $otherContact->id()]);
});
