<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\UseCases\UpdateVendorContactUseCase;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function updateVendorContactUseCase(): UpdateVendorContactUseCase
{
    return app(UpdateVendorContactUseCase::class);
}

function contactData(array $overrides = []): UpdateVendorContactData
{
    return UpdateVendorContactData::from(array_merge([
        'contactName' => 'Jane Smith',
        'contactPosition' => 'Director',
        'contactPhone' => '0898765432',
        'contactEmail' => 'jane.smith@company.com',
        'lineId' => 'jane-smith',
        'otherContact' => null,
        'isMainContact' => true,
    ], $overrides));
}

test('execute updates the vendor existing contact', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: true,
    ));

    updateVendorContactUseCase()->execute($profile->id(), contactData());

    $this->assertDatabaseHas('vendor_contact', [
        'vendor_profile_id' => $profile->id(),
        'contact_name' => 'Jane Smith',
        'contact_position' => 'Director',
        'contact_phone' => '0898765432',
        'contact_email' => 'jane.smith@company.com',
    ]);

    $this->assertDatabaseCount('vendor_contact', 1);
});

test('execute creates a contact when none exists yet', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    updateVendorContactUseCase()->execute($profile->id(), contactData());

    $this->assertDatabaseHas('vendor_contact', [
        'vendor_profile_id' => $profile->id(),
        'contact_name' => 'Jane Smith',
    ]);
});

test('execute allows clearing the optional phone and email', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: $user->id));

    $repository->saveContact(VendorContact::create(
        vendorProfileId: $profile->id(),
        contactName: 'Jane Doe',
        contactPosition: 'Manager',
        contactPhone: PhoneNumber::fromString('0812345678'),
        contactEmail: Email::fromString('contact@company.com'),
        lineId: 'acme-co',
        otherContact: null,
        isMainContact: true,
    ));

    updateVendorContactUseCase()->execute($profile->id(), contactData([
        'contactPhone' => null,
        'contactEmail' => null,
    ]));

    $this->assertDatabaseHas('vendor_contact', [
        'vendor_profile_id' => $profile->id(),
        'contact_phone' => null,
        'contact_email' => null,
    ]);
});
