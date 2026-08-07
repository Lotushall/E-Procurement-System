<?php

use App\Modules\User\Infrastructure\Models\User;
use Database\Seeders\VendorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('VendorSeeder never creates two documents of the same type for one vendor', function () {
    User::factory()->create(['email' => 'admin@example.com', 'user_type' => 'internal']);

    (new VendorSeeder)->run();

    $duplicates = DB::table('vendor_documents')
        ->select('vendor_profile_id', 'document_type')
        ->groupBy('vendor_profile_id', 'document_type')
        ->havingRaw('count(*) > 1')
        ->get();

    expect($duplicates)->toBeEmpty();
});

test('VendorSeeder only creates document types the frontend actually recognizes for that vendor type', function () {
    // Mirrors REQUIRED_DOCUMENTS keys in frontend/app/(public)/profiles/data/document-types.ts —
    // the only place these document_type strings are matched against on the vendor detail page.
    $companyTypes = ['company_certificate', 'authorized_person_id', 'vat_registration', 'shareholder_list', 'financial_statement'];
    $individualTypes = ['citizen_id', 'house_registration', 'commercial_registration', 'vat_registration'];

    User::factory()->create(['email' => 'admin@example.com', 'user_type' => 'internal']);

    (new VendorSeeder)->run();

    $companyProfileIds = DB::table('vendor_company_details')->pluck('vendor_profile_id');
    $individualProfileIds = DB::table('vendor_individual_details')->pluck('vendor_profile_id');

    $unrecognizedCompanyDocs = DB::table('vendor_documents')
        ->whereIn('vendor_profile_id', $companyProfileIds)
        ->whereNotIn('document_type', $companyTypes)
        ->count();

    $unrecognizedIndividualDocs = DB::table('vendor_documents')
        ->whereIn('vendor_profile_id', $individualProfileIds)
        ->whereNotIn('document_type', $individualTypes)
        ->count();

    expect($unrecognizedCompanyDocs)->toBe(0);
    expect($unrecognizedIndividualDocs)->toBe(0);
});
