<?php

use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorContact;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a vendor detail, contact, or document belongs to its vendor profile', function (string $model, string $relation) {
    $profile = VendorProfiles::factory()->create();
    $child = $model::factory()->create(['vendor_profile_id' => $profile->id]);

    expect($child->{$relation}->is($profile))->toBeTrue();
})->with([
    'company detail' => [VendorCompanyDetails::class, 'VendorDocumentsVendorProfile'],
    'individual detail' => [VendorIndividualDetails::class, 'VendorIndividualDetailsVendorProfile'],
    'contact' => [VendorContact::class, 'VendorContactVendorProfile'],
    'document' => [VendorDocuments::class, 'VendorDocumentsVendorProfile'],
]);

test('an approved vendor profile belongs to the user who verified it', function () {
    $profile = VendorProfiles::factory()->approved()->create();

    expect($profile->VendorProfilesVerifiedBy->id)->toBe($profile->verified_by);
});

test('an approved vendor document belongs to the user who verified it', function () {
    $document = VendorDocuments::factory()->approved()->create();

    expect($document->VendorDocumentsVerifiedBy->id)->toBe($document->verified_by);
});
