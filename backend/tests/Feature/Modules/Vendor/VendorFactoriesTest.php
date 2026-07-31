<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorContact;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('VendorProfiles factory creates a pending profile with a user', function () {
    $profile = VendorProfiles::factory()->create();

    expect($profile->verification_status->getValue())->toBe('pending');
    expect($profile->user_id)->not->toBeNull();
    expect(User::find($profile->user_id))->not->toBeNull();
});

test('VendorProfiles factory approved state sets verification fields', function () {
    $profile = VendorProfiles::factory()->approved()->create();

    expect($profile->verification_status->getValue())->toBe('approved');
    expect($profile->verified_at)->not->toBeNull();
    expect($profile->verified_by)->not->toBeNull();
});

test('VendorProfiles factory rejected state sets verification fields and a remark', function () {
    $profile = VendorProfiles::factory()->rejected()->create();

    expect($profile->verification_status->getValue())->toBe('rejected');
    expect($profile->verified_at)->not->toBeNull();
    expect($profile->verified_by)->not->toBeNull();
    expect($profile->remark)->not->toBeNull();
});

test('VendorCompanyDetails factory creates a detail row with its own parent profile', function () {
    $detail = VendorCompanyDetails::factory()->create();

    expect($detail->vendor_profile_id)->not->toBeNull();
    expect(VendorProfiles::find($detail->vendor_profile_id))->not->toBeNull();
});

test('VendorCompanyDetails factory can create multiple rows without unique constraint collisions', function () {
    $details = VendorCompanyDetails::factory()->count(3)->create();

    expect($details)->toHaveCount(3);
});

test('VendorIndividualDetails factory creates a detail row with its own parent profile', function () {
    $detail = VendorIndividualDetails::factory()->create();

    expect($detail->vendor_profile_id)->not->toBeNull();
    expect(VendorProfiles::find($detail->vendor_profile_id))->not->toBeNull();
});

test('VendorIndividualDetails factory can create multiple rows without unique constraint collisions', function () {
    $details = VendorIndividualDetails::factory()->count(3)->create();

    expect($details)->toHaveCount(3);
});

test('VendorContact factory produces a phone number the domain value object accepts', function () {
    $contact = VendorContact::factory()->create();

    $repository = new VendorRepository;
    $contacts = $repository->findContactsByVendorProfileId($contact->vendor_profile_id);

    expect($contacts)->toHaveCount(1);
    expect($contacts[0]->contactPhone()->value)->toBe($contact->contact_phone);
});

test('VendorDocuments factory rejected state sets verification fields and a remark', function () {
    $document = VendorDocuments::factory()->rejected()->create();

    expect($document->status->getValue())->toBe('rejected');
    expect($document->verified_by)->not->toBeNull();
    expect($document->verified_at)->not->toBeNull();
    expect($document->remark)->not->toBeNull();
});
