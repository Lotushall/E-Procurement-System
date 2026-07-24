<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\UseCases\DeleteVendorContactUseCase;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function deleteVendorContactUseCase(): DeleteVendorContactUseCase
{
    return app(DeleteVendorContactUseCase::class);
}

test('execute deletes the contact', function () {
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
        isMainContact: true,
    ));

    deleteVendorContactUseCase()->execute($profile->id(), $contact->id());

    $this->assertDatabaseMissing('vendor_contact', ['id' => $contact->id()]);
});

test('execute throws when the contact does not belong to the vendor profile', function () {
    $ownerUser = User::factory()->create(['user_type' => 'company']);
    $otherUser = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $ownerProfile = $repository->saveProfile(VendorProfile::create(userId: $ownerUser->id));
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

    expect(fn () => deleteVendorContactUseCase()->execute($ownerProfile->id(), $otherContact->id()))
        ->toThrow(ModelNotFoundException::class);

    $this->assertDatabaseHas('vendor_contact', ['id' => $otherContact->id()]);
});

test('execute throws when the contact id does not exist', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    expect(fn () => deleteVendorContactUseCase()->execute($profile->id(), 999999))
        ->toThrow(ModelNotFoundException::class);
});

test('execute resubmits an approved vendor profile back to pending after a contact is deleted', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $profile->approve(verifiedBy: $user->id);
    $repository->saveProfile($profile);

    $contact = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: true,
    ));

    deleteVendorContactUseCase()->execute($profile->id(), $contact->id());

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id(),
        'verification_status' => 'pending',
    ]);
});

test('execute does not error when the vendor profile is already pending', function () {
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
        isMainContact: true,
    ));

    deleteVendorContactUseCase()->execute($profile->id(), $contact->id());

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id(),
        'verification_status' => 'pending',
    ]);
});
