<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

/**
 * @param  list<string>  $permissions
 */
function updateTorUser(array $permissions = ['tors.update', 'tors.viewAny']): User
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
function updatableTor(string $status, array $attributes = []): Tors
{
    return Tors::factory()->status($status)->create(array_merge([
        'tor_code' => 'TOR-2026-0005',
        'fiscal_year' => 2026,
        'tender_project_id' => null,
        'created_by' => null,
    ], $attributes));
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function updateTorPayload(array $overrides = []): array
{
    $department = Department::firstOrCreate(['name' => 'IT']);

    return array_merge([
        'title' => 'จัดซื้อคอมพิวเตอร์ 60 เครื่อง',
        'scopeOfWork' => 'ขอบเขตงานใหม่',
        'departmentId' => $department->id,
        'tenderProjectId' => null,
        'budgetEstimate' => '650000.50',
        'procurementMethod' => 'e-bidding',
        'fiscalYear' => 2026,
        'biddingStartAt' => null,
        'biddingEndAt' => '2026-12-31 16:30:00',
    ], $overrides);
}

test('updating a TOR requires authentication', function () {
    $this->putJson('/api/v1/dashboard/tors/1', updateTorPayload())->assertStatus(401);
});

test('an internal user without tors.update cannot update a TOR', function () {
    $this->actingAs(updateTorUser(['tors.viewAny']), 'web');
    $tor = updatableTor('draft');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())->assertForbidden();
});

test('a vendor user cannot update a TOR even when granted tors.update', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.update', 'guard_name' => 'web']));
    $this->actingAs($user, 'web');
    $tor = updatableTor('draft');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())->assertForbidden();
});

test('updating a TOR outside the user visibility returns 404 and leaves it untouched', function () {
    $this->actingAs(updateTorUser(['tors.update', 'tors.viewOwn']), 'web');
    $tor = updatableTor('draft');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())->assertNotFound();

    $this->assertDatabaseMissing('tors', ['id' => $tor->id, 'title' => 'จัดซื้อคอมพิวเตอร์ 60 เครื่อง']);
});

test('a user may update a TOR they created when they can only see their own', function () {
    $user = updateTorUser(['tors.update', 'tors.viewOwn']);
    $this->actingAs($user, 'web');
    $tor = updatableTor('draft', ['created_by' => $user->id]);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())->assertOk();
});

test('updating a TOR that does not exist returns 404', function () {
    $this->actingAs(updateTorUser(), 'web');

    $this->putJson('/api/v1/dashboard/tors/999999', updateTorPayload())->assertNotFound();
});

test('a draft or sent-back TOR is updated and keeps its status and code', function (string $status) {
    $this->actingAs(updateTorUser(), 'web');
    $tor = updatableTor($status);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())
        ->assertOk()
        ->assertJsonPath('data.torCode', 'TOR-2026-0005')
        ->assertJsonPath('data.status', $status)
        ->assertJsonPath('data.title', 'จัดซื้อคอมพิวเตอร์ 60 เครื่อง')
        ->assertJsonPath('data.budgetEstimate', '650000.50');

    $this->assertDatabaseHas('tors', [
        'id' => $tor->id,
        'title' => 'จัดซื้อคอมพิวเตอร์ 60 เครื่อง',
        'scope_of_work' => 'ขอบเขตงานใหม่',
        'status' => $status,
    ]);
})->with(['draft', 'revision_required']);

test('updating an approved TOR sends it back for review and clears the approval', function () {
    $this->actingAs(updateTorUser(), 'web');
    $approver = User::factory()->create(['user_type' => 'internal']);
    $tor = updatableTor('approved', ['approved_by' => $approver->id, 'approved_at' => now()->subDay()]);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())
        ->assertOk()
        ->assertJsonPath('data.status', 'in_review')
        ->assertJsonPath('data.approvedBy', null)
        ->assertJsonPath('data.approvedAt', null);

    $this->assertDatabaseHas('tors', [
        'id' => $tor->id,
        'status' => 'in_review',
        'approved_by' => null,
        'approved_at' => null,
    ]);
});

test('a TOR past the editable steps cannot be updated without tors.manageAnyStatus', function (string $status) {
    $this->actingAs(updateTorUser(), 'web');
    $tor = updatableTor($status);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())
        ->assertUnprocessable()
        ->assertJsonStructure(['message']);

    $this->assertDatabaseHas('tors', ['id' => $tor->id, 'title' => $tor->title, 'status' => $status]);
})->with(['in_review', 'published', 'bidding', 'closed', 'no_bidder', 'awarded', 'completed', 'cancelled']);

test('a user with tors.manageAnyStatus updates a TOR at a locked step without changing its status', function (string $status) {
    $this->actingAs(updateTorUser(['tors.update', 'tors.viewAny', 'tors.manageAnyStatus']), 'web');
    $tor = updatableTor($status);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())
        ->assertOk()
        ->assertJsonPath('data.status', $status)
        ->assertJsonPath('data.title', 'จัดซื้อคอมพิวเตอร์ 60 เครื่อง');
})->with(['in_review', 'closed', 'completed', 'cancelled']);

test('an approved TOR edited by a user with tors.manageAnyStatus still goes back for review', function () {
    $this->actingAs(updateTorUser(['tors.update', 'tors.viewAny', 'tors.manageAnyStatus']), 'web');
    $tor = updatableTor('approved');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())
        ->assertOk()
        ->assertJsonPath('data.status', 'in_review')
        ->assertJsonPath('data.approvedBy', null);
});

test('saving an approved TOR unchanged keeps its approval', function () {
    $this->actingAs(updateTorUser(), 'web');
    $approver = User::factory()->create(['user_type' => 'internal']);
    $tor = updatableTor('approved', [
        'approved_by' => $approver->id,
        'remark' => 'อนุมัติตามเสนอ',
        'tender_project_id' => null,
        'bidding_start_at' => null,
        'bidding_end_at' => '2026-12-31 16:30:00',
    ]);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload([
        'title' => $tor->title,
        'scopeOfWork' => $tor->scope_of_work,
        'departmentId' => $tor->department_id,
        'budgetEstimate' => $tor->budget_estimate,
        'procurementMethod' => $tor->procurement_method,
    ]))
        ->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.approvedBy.id', $approver->id)
        ->assertJsonPath('data.remark', 'อนุมัติตามเสนอ');
});

test('editing an approved TOR clears the approval remark', function () {
    $this->actingAs(updateTorUser(), 'web');
    $tor = updatableTor('approved', ['remark' => 'อนุมัติตามเสนอ']);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload())
        ->assertOk()
        ->assertJsonPath('data.remark', null);
});

test('a published TOR may not be left without a bidding start still ahead', function (?string $start) {
    $this->actingAs(updateTorUser(['tors.update', 'tors.viewAny', 'tors.manageAnyStatus']), 'web');
    $tor = updatableTor('published');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload([
        'biddingStartAt' => $start,
        'biddingEndAt' => now()->addDays(30)->toDateTimeString(),
    ]))
        ->assertUnprocessable()
        ->assertJsonStructure(['message']);

    $this->assertDatabaseHas('tors', ['id' => $tor->id, 'title' => $tor->title, 'status' => 'published']);
})->with([
    'cleared' => [null],
    'moved into the past' => [fn () => now()->subDay()->toDateTimeString()],
]);

test('a published TOR keeps its status when its bidding window moves to another future date', function () {
    $this->actingAs(updateTorUser(['tors.update', 'tors.viewAny', 'tors.manageAnyStatus']), 'web');
    $tor = updatableTor('published');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload([
        'biddingStartAt' => now()->addDays(5)->toDateTimeString(),
        'biddingEndAt' => now()->addDays(30)->toDateTimeString(),
    ]))
        ->assertOk()
        ->assertJsonPath('data.status', 'published');
});

test('a bidding TOR may not have its bid deadline cleared or moved into the past', function (?string $end) {
    $this->actingAs(updateTorUser(['tors.update', 'tors.viewAny', 'tors.manageAnyStatus']), 'web');
    $tor = updatableTor('bidding');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload([
        'biddingStartAt' => now()->subDays(10)->toDateTimeString(),
        'biddingEndAt' => $end,
    ]))
        ->assertUnprocessable();

    $this->assertDatabaseHas('tors', ['id' => $tor->id, 'status' => 'bidding']);
})->with([
    'cleared' => [null],
    'moved into the past' => [fn () => now()->subDay()->toDateTimeString()],
]);

test('a bidding TOR keeps its status when its bid deadline is extended', function () {
    $this->actingAs(updateTorUser(['tors.update', 'tors.viewAny', 'tors.manageAnyStatus']), 'web');
    $tor = updatableTor('bidding');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload([
        'biddingStartAt' => now()->subDays(10)->toDateTimeString(),
        'biddingEndAt' => now()->addDays(10)->toDateTimeString(),
    ]))
        ->assertOk()
        ->assertJsonPath('data.status', 'bidding');
});

test('a TOR may not be moved into a tender project that no longer takes TORs', function (string $projectStatus) {
    $this->actingAs(updateTorUser(), 'web');
    $department = Department::firstOrCreate(['name' => 'IT']);
    $project = TenderProjects::factory()->create(['department_id' => $department->id, 'status' => $projectStatus]);
    $tor = updatableTor('draft', ['department_id' => $department->id]);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload(['tenderProjectId' => $project->id]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['tenderProjectId']);
})->with(['closed', 'completed', 'cancelled', 'archived']);

test('a TOR already in a tender project that no longer takes TORs may still be edited', function () {
    $this->actingAs(updateTorUser(), 'web');
    $department = Department::firstOrCreate(['name' => 'IT']);
    $project = TenderProjects::factory()->create(['department_id' => $department->id, 'status' => 'closed']);
    $tor = updatableTor('draft', ['department_id' => $department->id, 'tender_project_id' => $project->id]);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload(['tenderProjectId' => $project->id]))
        ->assertOk()
        ->assertJsonPath('data.tenderProject.id', $project->id);
});

test('a department viewer may still update a TOR they created after moving it to another department', function () {
    $ownDepartment = Department::firstOrCreate(['name' => 'IT']);
    $otherDepartment = Department::firstOrCreate(['name' => 'Finance']);
    $user = updateTorUser(['tors.update', 'tors.viewDepartment']);
    InternalProfiles::create([
        'user_id' => $user->id,
        'firstname' => 'A',
        'lastname' => 'B',
        'department_id' => $ownDepartment->id,
    ]);
    $this->actingAs($user, 'web');
    $tor = updatableTor('draft', ['department_id' => $ownDepartment->id, 'created_by' => $user->id]);

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload(['departmentId' => $otherDepartment->id]))
        ->assertOk();
    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload(['departmentId' => $otherDepartment->id, 'title' => 'ชื่อใหม่']))
        ->assertOk()
        ->assertJsonPath('data.title', 'ชื่อใหม่');
});

test('moving a TOR to another fiscal year issues the next code of that year', function () {
    $this->actingAs(updateTorUser(), 'web');
    Tors::factory()->status('draft')->create(['tor_code' => 'TOR-2027-0003', 'fiscal_year' => 2027, 'tender_project_id' => null]);
    $tor = updatableTor('draft');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, updateTorPayload(['fiscalYear' => 2027]))
        ->assertOk()
        ->assertJsonPath('data.torCode', 'TOR-2027-0004')
        ->assertJsonPath('data.fiscalYear', 2027);
});

test('updating a TOR validates the payload like creating one', function () {
    $this->actingAs(updateTorUser(), 'web');
    $tor = updatableTor('draft');

    $this->putJson('/api/v1/dashboard/tors/'.$tor->id, [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title', 'scopeOfWork', 'departmentId', 'budgetEstimate', 'procurementMethod', 'fiscalYear']);
});
