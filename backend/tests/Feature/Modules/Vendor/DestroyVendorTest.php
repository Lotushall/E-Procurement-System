<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use App\Modules\Vendor\Infrastructure\Models\VendorDocuments;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('deleting a vendor requires authentication', function () {
    $profile = VendorProfiles::factory()->create();

    $response = $this->deleteJson("/api/v1/vendors/{$profile->id}");

    $response->assertStatus(401);
});

test('a vendor user cannot delete a vendor', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = VendorProfiles::factory()->create();
    $this->actingAs($vendorUser, 'web');

    $response = $this->deleteJson("/api/v1/vendors/{$profile->id}");

    $response->assertStatus(403);
});

test('an internal user without the vendors.delete permission cannot delete a vendor', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $profile = VendorProfiles::factory()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->deleteJson("/api/v1/vendors/{$profile->id}");

    $response->assertStatus(403);
});

test('a non-internal user cannot delete a vendor even if directly granted the vendors.delete permission', function () {
    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $vendorUser->givePermissionTo(Permission::firstOrCreate(['name' => 'vendors.delete', 'guard_name' => 'web']));
    $profile = VendorProfiles::factory()->create();
    $this->actingAs($vendorUser, 'web');

    $response = $this->deleteJson("/api/v1/vendors/{$profile->id}");

    $response->assertStatus(403);
    $this->assertDatabaseHas('vendor_profiles', ['id' => $profile->id]);
});

test('an internal user can delete a vendor', function () {
    $internalUser = User::factory()->internal()->create();
    $profile = VendorProfiles::factory()->create();
    $vendorUserId = $profile->user_id;
    $this->actingAs($internalUser, 'web');

    $response = $this->deleteJson("/api/v1/vendors/{$profile->id}");

    $response->assertStatus(204);
    $this->assertSoftDeleted('users', ['id' => $vendorUserId]);
    $this->assertDatabaseHas('vendor_profiles', ['id' => $profile->id]);
});

test('deleting a vendor revokes the linked user account sessions', function () {
    $internalUser = User::factory()->internal()->create();
    $profile = VendorProfiles::factory()->create();
    DB::table('sessions')->insert([
        'id' => 'vendor-delete-session',
        'user_id' => $profile->user_id,
        'ip_address' => '10.0.0.6',
        'user_agent' => 'Mozilla/5.0',
        'payload' => 'x',
        'last_activity' => now()->timestamp,
    ]);
    $this->actingAs($internalUser, 'web');

    $this->deleteJson("/api/v1/vendors/{$profile->id}")->assertStatus(204);

    expect(DB::table('sessions')->where('id', 'vendor-delete-session')->exists())->toBeFalse();
});

test('deleting a vendor frees its username and email for reuse', function () {
    $internalUser = User::factory()->internal()->create();
    $vendorUser = User::factory()->create([
        'user_type' => 'company',
        'username' => 'reusable',
        'email' => 'reusable@example.com',
    ]);
    $profile = VendorProfiles::factory()->create(['user_id' => $vendorUser->id]);
    $this->actingAs($internalUser, 'web');

    $this->deleteJson("/api/v1/vendors/{$profile->id}")->assertStatus(204);

    $this->assertDatabaseMissing('users', ['id' => $vendorUser->id, 'username' => 'reusable']);
    $newUser = User::factory()->create(['username' => 'reusable', 'email' => 'reusable@example.com']);
    expect($newUser->id)->not->toBe($vendorUser->id);
});

test('deleting a nonexistent vendor returns 404', function () {
    $internalUser = User::factory()->internal()->create();
    $this->actingAs($internalUser, 'web');

    $response = $this->deleteJson('/api/v1/vendors/999999');

    $response->assertStatus(404);
});

test('deleting a company vendor frees its tax id and business registration number for reuse', function () {
    $internalUser = User::factory()->internal()->create();
    $repository = new VendorRepository;
    $profile = $repository->saveProfile(VendorProfile::create(userId: User::factory()->create(['user_type' => 'company'])->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Acme Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));
    $this->actingAs($internalUser, 'web');

    $this->deleteJson("/api/v1/vendors/{$profile->id()}")->assertStatus(204);

    $newProfile = $repository->saveProfile(VendorProfile::create(userId: User::factory()->create(['user_type' => 'company'])->id));
    $newDetail = $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $newProfile->id(),
        companyName: 'Reincorporated Co., Ltd.',
        businessRegistrationNo: '0123456789012',
        taxId: TaxId::fromString('1234567890123'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    expect($newDetail->id())->not->toBeNull();
});

test('a vendor deleted via the admin endpoint is fully purged, including document files, once past the 30-day retention window', function () {
    $internalUser = User::factory()->internal()->create();
    $profile = VendorProfiles::factory()->create();
    $vendorUserId = $profile->user_id;
    Storage::fake('local');
    Storage::disk('local')->put('vendor-documents/keepsake.pdf', 'content');
    VendorDocuments::factory()->create([
        'vendor_profile_id' => $profile->id,
        'file_path' => 'vendor-documents/keepsake.pdf',
    ]);
    $this->actingAs($internalUser, 'web');

    $this->deleteJson("/api/v1/vendors/{$profile->id}")->assertStatus(204);

    // Still within the 30-day retention window: profile and file remain.
    $this->assertDatabaseHas('vendor_profiles', ['id' => $profile->id]);
    Storage::disk('local')->assertExists('vendor-documents/keepsake.pdf');

    // Fast-forward past the retention window and run the scheduled purge.
    User::withTrashed()->whereKey($vendorUserId)->update(['deleted_at' => now()->subDays(31)]);

    $this->artisan('app:purge-soft-deleted-users')->assertExitCode(0);

    $this->assertDatabaseMissing('users', ['id' => $vendorUserId]);
    $this->assertDatabaseMissing('vendor_profiles', ['id' => $profile->id]);
    Storage::disk('local')->assertMissing('vendor-documents/keepsake.pdf');
});
