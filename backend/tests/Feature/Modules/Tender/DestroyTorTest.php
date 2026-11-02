<?php

use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

/**
 * @param  list<string>  $permissions
 */
function destroyTorUser(array $permissions = ['tors.delete', 'tors.viewAny']): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    return $user;
}

/**
 * @param  array<string, mixed>  $attributes
 */
function deletableTor(string $status, array $attributes = []): Tors
{
    return Tors::factory()->status($status)->create(array_merge([
        'tender_project_id' => null,
        'created_by' => null,
    ], $attributes));
}

test('deleting a TOR requires authentication', function () {
    $this->deleteJson('/api/v1/dashboard/tors/1')->assertStatus(401);
});

test('an internal user without tors.delete cannot delete a TOR', function () {
    $this->actingAs(destroyTorUser(['tors.viewAny']), 'web');
    $tor = deletableTor('draft');

    $this->deleteJson('/api/v1/dashboard/tors/'.$tor->id)->assertForbidden();

    $this->assertDatabaseHas('tors', ['id' => $tor->id]);
});

test('a vendor user cannot delete a TOR even when granted tors.delete', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.delete', 'guard_name' => 'web']));
    $this->actingAs($user, 'web');
    $tor = deletableTor('draft');

    $this->deleteJson('/api/v1/dashboard/tors/'.$tor->id)->assertForbidden();
});

test('deleting a TOR outside the user visibility returns 404 and keeps it', function () {
    $this->actingAs(destroyTorUser(['tors.delete', 'tors.viewOwn']), 'web');
    $tor = deletableTor('draft');

    $this->deleteJson('/api/v1/dashboard/tors/'.$tor->id)->assertNotFound();

    $this->assertDatabaseHas('tors', ['id' => $tor->id]);
});

test('deleting a TOR that does not exist returns 404', function () {
    $this->actingAs(destroyTorUser(), 'web');

    $this->deleteJson('/api/v1/dashboard/tors/999999')->assertNotFound();
});

test('a draft or sent-back TOR is deleted', function (string $status) {
    $this->actingAs(destroyTorUser(), 'web');
    $tor = deletableTor($status);

    $this->deleteJson('/api/v1/dashboard/tors/'.$tor->id)->assertNoContent();

    $this->assertDatabaseMissing('tors', ['id' => $tor->id]);
})->with(['draft', 'revision_required']);

test('a TOR sent for review or later cannot be deleted without tors.manageAnyStatus', function (string $status) {
    $this->actingAs(destroyTorUser(), 'web');
    $tor = deletableTor($status);

    $this->deleteJson('/api/v1/dashboard/tors/'.$tor->id)
        ->assertUnprocessable()
        ->assertJsonStructure(['message']);

    $this->assertDatabaseHas('tors', ['id' => $tor->id]);
})->with(['in_review', 'approved', 'published', 'bidding', 'closed', 'no_bidder', 'awarded', 'completed', 'cancelled']);

test('a user with tors.manageAnyStatus deletes a TOR at any step', function (string $status) {
    $this->actingAs(destroyTorUser(['tors.delete', 'tors.viewAny', 'tors.manageAnyStatus']), 'web');
    $tor = deletableTor($status);

    $this->deleteJson('/api/v1/dashboard/tors/'.$tor->id)->assertNoContent();

    $this->assertDatabaseMissing('tors', ['id' => $tor->id]);
})->with(['in_review', 'approved', 'bidding', 'completed', 'cancelled']);
