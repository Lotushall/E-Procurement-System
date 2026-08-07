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
