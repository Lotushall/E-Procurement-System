<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function contactPayload(array $overrides = []): array
{
    return array_merge([
        'contactName' => 'Jane Smith',
        'contactPosition' => 'Director',
        'contactPhone' => '0898765432',
        'contactEmail' => 'jane.smith@company.com',
        'lineId' => 'jane-smith',
        'otherContact' => null,
        'isMainContact' => true,
    ], $overrides);
}

test('a vendor can update their contact info', function () {
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

    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/contact', contactPayload());

    $response->assertOk()
        ->assertJsonPath('data.contact.0.contactName', 'Jane Smith');

    $this->assertDatabaseHas('vendor_contact', [
        'vendor_profile_id' => $profile->id(),
        'contact_name' => 'Jane Smith',
        'contact_position' => 'Director',
    ]);
});

test('updating vendor contact requires authentication', function () {
    $response = $this->postJson('/api/v1/vendor/contact', contactPayload());

    $response->assertStatus(401);
});

test('contact name is required when updating vendor contact', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/contact', contactPayload(['contactName' => null]));

    $response->assertStatus(422)->assertJsonValidationErrors('contactName');
});

test('id must be an integer when updating vendor contact', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $repository = new VendorRepository;
    $repository->saveProfile(VendorProfile::create(userId: $user->id));
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/contact', contactPayload(['id' => 'not-a-number']));

    $response->assertStatus(422)->assertJsonValidationErrors('id');
});

test('vendor contact response includes the contact id', function () {
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

    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/vendor/contact', contactPayload(['id' => $contact->id()]));

    $response->assertOk()->assertJsonPath('data.contact.0.id', $contact->id());
});
