<?php

use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo('2026-11-05 10:00:00');
});

/**
 * @param  list<string>  $permissions
 */
function nextTorCodeUser(array $permissions = ['tors.create']): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    return $user;
}

test('previewing the next TOR code requires authentication', function () {
    $this->getJson('/api/v1/dashboard/tors/next-code')->assertStatus(401);
});

test('an internal user without tors.create cannot preview the next TOR code', function () {
    $this->actingAs(nextTorCodeUser(['tors.viewAny']), 'web');

    $this->getJson('/api/v1/dashboard/tors/next-code')->assertForbidden();
});

test('a vendor user cannot preview the next TOR code even when granted tors.create', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.create', 'guard_name' => 'web']));
    $this->actingAs($user, 'web');

    $this->getJson('/api/v1/dashboard/tors/next-code')->assertForbidden();
});

test('the first TOR code of a year without TORs is sequence 0001 of the current year', function () {
    $this->actingAs(nextTorCodeUser(), 'web');

    $this->getJson('/api/v1/dashboard/tors/next-code')
        ->assertSuccessful()
        ->assertExactJson(['data' => ['torCode' => 'TOR-2026-0001']]);
});

test('the preview uses the calendar year, not the fiscal year that starts in October', function () {
    $this->actingAs(nextTorCodeUser(), 'web');
    $this->travelTo('2027-01-01 00:00:00');

    $this->getJson('/api/v1/dashboard/tors/next-code')
        ->assertSuccessful()
        ->assertJsonPath('data.torCode', 'TOR-2027-0001');
});

test('the preview follows the issued counter, including numbers of deleted TORs', function () {
    $this->actingAs(nextTorCodeUser(), 'web');
    DB::table('tor_code_sequences')->insert([
        'year' => 2026,
        'last_sequence' => 12,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->getJson('/api/v1/dashboard/tors/next-code')
        ->assertSuccessful()
        ->assertJsonPath('data.torCode', 'TOR-2026-0013');
});

test('without a counter the preview continues after the highest existing TOR code of the year', function () {
    $this->actingAs(nextTorCodeUser(), 'web');
    Tors::factory()->create(['tor_code' => 'TOR-2026-0007']);
    Tors::factory()->create(['tor_code' => 'TOR-2025-0040']);

    $this->getJson('/api/v1/dashboard/tors/next-code')
        ->assertSuccessful()
        ->assertJsonPath('data.torCode', 'TOR-2026-0008');
});

test('previewing does not issue the number', function () {
    $this->actingAs(nextTorCodeUser(), 'web');

    $this->getJson('/api/v1/dashboard/tors/next-code')->assertJsonPath('data.torCode', 'TOR-2026-0001');
    $this->getJson('/api/v1/dashboard/tors/next-code')->assertJsonPath('data.torCode', 'TOR-2026-0001');

    $this->assertDatabaseMissing('tor_code_sequences', ['year' => 2026]);
});
