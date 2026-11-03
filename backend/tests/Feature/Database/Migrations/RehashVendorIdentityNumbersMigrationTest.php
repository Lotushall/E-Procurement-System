<?php

use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Shared\Support\IdentityHash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function runIdentityRehashMigration()
{
    return require database_path('migrations/2026_11_03_095733_rehash_vendor_identity_numbers_with_hmac.php');
}

function legacyTombstone(string $hash, int $vendorProfileId): string
{
    return hash('sha256', "{$hash}-deleted-{$vendorProfileId}");
}

test('up turns plain SHA-256 hashes of live numbers into HMACs', function () {
    $company = VendorCompanyDetails::factory()->create(['tax_id' => '0105536000313']);
    $individual = VendorIndividualDetails::factory()->create(['citizen_id' => '1101700230708', 'tax_id' => '3101500123459']);
    DB::table('vendor_company_details')->where('id', $company->id)->update(['tax_id_hash' => hash('sha256', '0105536000313')]);
    DB::table('vendor_individual_details')->where('id', $individual->id)->update([
        'citizen_id_hash' => hash('sha256', '1101700230708'),
        'tax_id_hash' => hash('sha256', '3101500123459'),
    ]);

    runIdentityRehashMigration()->up();

    expect(DB::table('vendor_company_details')->where('id', $company->id)->value('tax_id_hash'))->toBe(IdentityHash::make('0105536000313'))
        ->and(DB::table('vendor_individual_details')->where('id', $individual->id)->value('citizen_id_hash'))->toBe(IdentityHash::make('1101700230708'))
        ->and(DB::table('vendor_individual_details')->where('id', $individual->id)->value('tax_id_hash'))->toBe(IdentityHash::make('3101500123459'));
});

test('up keeps a deleted vendor tombstoned, rebuilt on the HMAC', function () {
    $company = VendorCompanyDetails::factory()->create(['tax_id' => '0105536000313']);
    DB::table('vendor_company_details')->where('id', $company->id)->update([
        'tax_id_hash' => legacyTombstone(hash('sha256', '0105536000313'), $company->vendor_profile_id),
    ]);

    runIdentityRehashMigration()->up();

    expect(DB::table('vendor_company_details')->where('id', $company->id)->value('tax_id_hash'))
        ->toBe(legacyTombstone(IdentityHash::make('0105536000313'), $company->vendor_profile_id));
});

test('up leaves a hash that matches neither a live hash nor a tombstone unchanged', function () {
    $company = VendorCompanyDetails::factory()->create(['tax_id' => '0105536000313']);
    DB::table('vendor_company_details')->where('id', $company->id)->update(['tax_id_hash' => str_repeat('a', 64)]);

    runIdentityRehashMigration()->up();

    expect(DB::table('vendor_company_details')->where('id', $company->id)->value('tax_id_hash'))->toBe(str_repeat('a', 64));
});

test('up skips an individual without a tax ID', function () {
    $individual = VendorIndividualDetails::factory()->create(['tax_id' => null, 'tax_id_hash' => null]);

    runIdentityRehashMigration()->up();

    expect(DB::table('vendor_individual_details')->where('id', $individual->id)->value('tax_id_hash'))->toBeNull();
});

test('down restores the plain SHA-256 hashes and tombstones', function () {
    $company = VendorCompanyDetails::factory()->create(['tax_id' => '0105536000313']);
    $individual = VendorIndividualDetails::factory()->create(['citizen_id' => '1101700230708']);
    DB::table('vendor_company_details')->where('id', $company->id)->update(['tax_id_hash' => IdentityHash::make('0105536000313')]);
    DB::table('vendor_individual_details')->where('id', $individual->id)->update([
        'citizen_id_hash' => legacyTombstone(IdentityHash::make('1101700230708'), $individual->vendor_profile_id),
    ]);

    runIdentityRehashMigration()->down();

    expect(DB::table('vendor_company_details')->where('id', $company->id)->value('tax_id_hash'))->toBe(hash('sha256', '0105536000313'))
        ->and(DB::table('vendor_individual_details')->where('id', $individual->id)->value('citizen_id_hash'))
        ->toBe(legacyTombstone(hash('sha256', '1101700230708'), $individual->vendor_profile_id));
});
