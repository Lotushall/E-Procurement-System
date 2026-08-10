<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Profile\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\Profile\UseCases\SaveVendorContactUseCase;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function saveVendorContactUseCase(): SaveVendorContactUseCase
{
    return app(SaveVendorContactUseCase::class);
}

function contactData(array $overrides = []): UpdateVendorContactData
{
    return UpdateVendorContactData::from(array_merge([
        'id' => null,
        'contactName' => 'Jane Smith',
        'contactPosition' => 'Director',
        'contactPhone' => '0898765432',
        'contactEmail' => 'jane.smith@company.com',
        'lineId' => 'jane-smith',
        'otherContact' => null,
        'isMainContact' => true,
    ], $overrides));
}

test('execute updates the contact matching the given id', function () {
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

    saveVendorContactUseCase()->execute($profile->id(), contactData(['id' => $contact->id()]));

    $this->assertDatabaseHas('vendor_contact', [
        'id' => $contact->id(),
        'vendor_profile_id' => $profile->id(),
        'contact_name' => 'Jane Smith',
        'contact_position' => 'Director',
        'contact_phone' => '0898765432',
        'contact_email' => 'jane.smith@company.com',
    ]);

    $this->assertDatabaseCount('vendor_contact', 1);
});

test('execute updates only the contact matching the given id, not other contacts', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $first = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'First Contact',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('first@company.com'),
        lineId: null,
        otherContact: null,
        isMainContact: true,
    ));

    $second = $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Second Contact',
        contactPosition: 'Staff',
        contactPhone: PhoneNumber::fromString('0898765432'),
        contactEmail: Email::fromString('second@company.com'),
        lineId: null,
        otherContact: null,
        isMainContact: false,
    ));

    saveVendorContactUseCase()->execute($profile->id(), contactData([
        'id' => $second->id(),
        'contactName' => 'Second Contact Updated',
    ]));

    $this->assertDatabaseHas('vendor_contact', [
        'id' => $first->id(),
        'contact_name' => 'First Contact',
    ]);

    $this->assertDatabaseHas('vendor_contact', [
        'id' => $second->id(),
        'contact_name' => 'Second Contact Updated',
    ]);

    $this->assertDatabaseCount('vendor_contact', 2);
});

test('execute creates a contact when no id is given', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    saveVendorContactUseCase()->execute($profile->id(), contactData());

    $this->assertDatabaseHas('vendor_contact', [
        'vendor_profile_id' => $profile->id(),
        'contact_name' => 'Jane Smith',
    ]);

    $this->assertDatabaseCount('vendor_contact', 1);
});

test('execute creates a new contact when id is omitted even if one already exists', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Existing Contact',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('existing@company.com'),
        lineId: null,
        otherContact: null,
        isMainContact: true,
    ));

    saveVendorContactUseCase()->execute($profile->id(), contactData(['isMainContact' => false]));

    $this->assertDatabaseHas('vendor_contact', ['contact_name' => 'Existing Contact']);
    $this->assertDatabaseHas('vendor_contact', ['contact_name' => 'Jane Smith']);
    $this->assertDatabaseCount('vendor_contact', 2);
});

test('execute allows clearing the optional phone and email', function () {
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

    saveVendorContactUseCase()->execute($profile->id(), contactData([
        'id' => $contact->id(),
        'contactPhone' => null,
        'contactEmail' => null,
    ]));

    $this->assertDatabaseHas('vendor_contact', [
        'vendor_profile_id' => $profile->id(),
        'contact_phone' => null,
        'contact_email' => null,
    ]);
});

test('execute throws when the given id does not belong to the vendor profile', function () {
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

    expect(fn () => saveVendorContactUseCase()->execute(
        $ownerProfile->id(),
        contactData(['id' => $otherContact->id()]),
    ))->toThrow(ModelNotFoundException::class);

    $this->assertDatabaseHas('vendor_contact', [
        'id' => $otherContact->id(),
        'contact_name' => 'Other Vendor Contact',
    ]);
});
