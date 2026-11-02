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
function storeTorUser(array $permissions = ['tors.create']): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    return $user;
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function validTorPayload(array $overrides = []): array
{
    $department = Department::firstOrCreate(['name' => 'IT']);

    return array_merge([
        'title' => 'จัดซื้อคอมพิวเตอร์ 50 เครื่อง',
        'scopeOfWork' => 'ขอบเขตงานจัดซื้อคอมพิวเตอร์',
        'departmentId' => $department->id,
        'tenderProjectId' => null,
        'budgetEstimate' => 500000,
        'procurementMethod' => 'e-bidding',
        'fiscalYear' => 2569,
        'biddingStartAt' => '2026-12-01 09:00:00',
        'biddingEndAt' => '2026-12-15 16:30:00',
    ], $overrides);
}

test('creating a TOR requires authentication', function () {
    $this->postJson('/api/v1/dashboard/tors', validTorPayload())->assertStatus(401);
});

test('an internal user without tors.create cannot create a TOR', function () {
    $this->actingAs(storeTorUser(['tors.viewAny']), 'web');

    $this->postJson('/api/v1/dashboard/tors', validTorPayload())->assertForbidden();
});

test('a vendor user cannot create a TOR even when granted tors.create', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.create', 'guard_name' => 'web']));
    $this->actingAs($user, 'web');

    $this->postJson('/api/v1/dashboard/tors', validTorPayload())->assertForbidden();
});

test('an internal user with tors.create creates a draft TOR with a generated code', function () {
    $user = storeTorUser();
    $this->actingAs($user, 'web');

    $this->postJson('/api/v1/dashboard/tors', validTorPayload())
        ->assertCreated()
        ->assertJsonPath('data.torCode', 'TOR-2569-0001')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.title', 'จัดซื้อคอมพิวเตอร์ 50 เครื่อง')
        ->assertJsonPath('data.budgetEstimate', '500000.00')
        ->assertJsonPath('data.createdBy.id', $user->id)
        ->assertJsonPath('data.approvedBy', null);

    $this->assertDatabaseHas('tors', [
        'tor_code' => 'TOR-2569-0001',
        'status' => 'draft',
        'created_by' => $user->id,
        'approved_by' => null,
    ]);
});

test('the TOR code sequence increments within a fiscal year and restarts for a new one', function () {
    $this->actingAs(storeTorUser(), 'web');

    $this->postJson('/api/v1/dashboard/tors', validTorPayload());

    $this->postJson('/api/v1/dashboard/tors', validTorPayload())
        ->assertJsonPath('data.torCode', 'TOR-2569-0002');
    $this->postJson('/api/v1/dashboard/tors', validTorPayload(['fiscalYear' => 2570]))
        ->assertJsonPath('data.torCode', 'TOR-2570-0001');
});

test('a deleted TOR code is never issued again', function () {
    $this->actingAs(storeTorUser(['tors.create', 'tors.delete', 'tors.viewAny']), 'web');

    $first = $this->postJson('/api/v1/dashboard/tors', validTorPayload())->json('data.id');
    $this->deleteJson('/api/v1/dashboard/tors/'.$first)->assertNoContent();

    $this->postJson('/api/v1/dashboard/tors', validTorPayload())
        ->assertJsonPath('data.torCode', 'TOR-2569-0002');
});

test('the first code of a year continues after the highest existing code, compared as a number', function () {
    $this->actingAs(storeTorUser(), 'web');
    Tors::factory()->create(['tor_code' => 'TOR-2569-9999', 'fiscal_year' => 2569, 'tender_project_id' => null]);
    Tors::factory()->create(['tor_code' => 'TOR-2569-10000', 'fiscal_year' => 2569, 'tender_project_id' => null]);

    $this->postJson('/api/v1/dashboard/tors', validTorPayload())
        ->assertCreated()
        ->assertJsonPath('data.torCode', 'TOR-2569-10001');
});

test('a department viewer still sees a TOR they created for another department', function () {
    $user = storeTorUser(['tors.create', 'tors.viewDepartment']);
    InternalProfiles::create([
        'user_id' => $user->id,
        'firstname' => 'A',
        'lastname' => 'B',
        'department_id' => Department::firstOrCreate(['name' => 'Finance'])->id,
    ]);
    $this->actingAs($user, 'web');

    $id = $this->postJson('/api/v1/dashboard/tors', validTorPayload())
        ->assertCreated()
        ->assertJsonPath('data.torCode', 'TOR-2569-0001')
        ->json('data.id');

    $this->getJson('/api/v1/dashboard/tors/'.$id)->assertOk();
});

test('creating a TOR requires the required fields', function () {
    $this->actingAs(storeTorUser(), 'web');

    $this->postJson('/api/v1/dashboard/tors', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title', 'scopeOfWork', 'departmentId', 'budgetEstimate', 'procurementMethod', 'fiscalYear']);
});

test('creating a TOR rejects invalid values', function (array $overrides, string $field) {
    $this->actingAs(storeTorUser(), 'web');

    $this->postJson('/api/v1/dashboard/tors', validTorPayload($overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field]);
})->with([
    'nonexistent department' => [['departmentId' => 999999], 'departmentId'],
    'nonexistent tender project' => [['tenderProjectId' => 999999], 'tenderProjectId'],
    'budget with 3 decimals' => [['budgetEstimate' => 100.999], 'budgetEstimate'],
    'negative budget' => [['budgetEstimate' => -1], 'budgetEstimate'],
    'negative fiscal year' => [['fiscalYear' => -1], 'fiscalYear'],
    'bid deadline before bidding start' => [['biddingStartAt' => '2026-12-15', 'biddingEndAt' => '2026-12-01'], 'biddingEndAt'],
    'bid deadline equal to bidding start' => [['biddingStartAt' => '2026-12-15 09:00:00', 'biddingEndAt' => '2026-12-15 09:00:00'], 'biddingEndAt'],
]);

test('creating a TOR accepts a bid deadline without a bidding start', function () {
    $this->actingAs(storeTorUser(), 'web');

    $this->postJson('/api/v1/dashboard/tors', validTorPayload(['biddingStartAt' => null]))
        ->assertCreated()
        ->assertJsonPath('data.biddingStartAt', null);
});

test('creating a TOR inside an open tender project of the same department succeeds', function (string $projectStatus) {
    $this->actingAs(storeTorUser(), 'web');
    $department = Department::firstOrCreate(['name' => 'IT']);
    $project = TenderProjects::factory()->create(['department_id' => $department->id, 'status' => $projectStatus]);

    $this->postJson('/api/v1/dashboard/tors', validTorPayload(['tenderProjectId' => $project->id]))
        ->assertCreated()
        ->assertJsonPath('data.tenderProject.id', $project->id);
})->with(['draft', 'published']);

test('creating a TOR inside a tender project that no longer takes TORs is rejected', function (string $projectStatus) {
    $this->actingAs(storeTorUser(), 'web');
    $department = Department::firstOrCreate(['name' => 'IT']);
    $project = TenderProjects::factory()->create(['department_id' => $department->id, 'status' => $projectStatus]);

    $this->postJson('/api/v1/dashboard/tors', validTorPayload(['tenderProjectId' => $project->id]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['tenderProjectId']);
})->with(['closed', 'completed', 'cancelled', 'archived']);

test('creating a TOR inside a tender project of another department is rejected', function () {
    $this->actingAs(storeTorUser(), 'web');
    $otherDepartment = Department::firstOrCreate(['name' => 'Finance']);
    $project = TenderProjects::factory()->create(['department_id' => $otherDepartment->id]);

    $this->postJson('/api/v1/dashboard/tors', validTorPayload(['tenderProjectId' => $project->id]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['tenderProjectId']);

    $this->assertDatabaseCount('tors', 0);
});
