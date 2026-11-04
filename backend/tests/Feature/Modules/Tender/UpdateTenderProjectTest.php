<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function internalUserWithTenderProjectUpdatePermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.update', 'guard_name' => 'web']));

    return $user;
}

function validUpdateTenderProjectPayload(array $overrides = []): array
{
    $department = Department::firstOrCreate(['name' => 'Finance']);

    return array_merge([
        'name' => 'จัดซื้อคอมพิวเตอร์ (แก้ไข)',
        'description' => 'รายละเอียดใหม่',
        'budget' => 750000,
        'departmentId' => $department->id,
        'personInChargeId' => null,
        'procurementMethod' => 'วิธีคัดเลือก',
        'fiscalYear' => 2026,
        'projectStartAt' => '2026-10-01',
        'projectEndAt' => '2027-03-31',
    ], $overrides);
}

test('updating a tender project requires authentication', function () {
    $project = TenderProjects::factory()->status('draft')->create();

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertStatus(401);
});

test('an internal user without the update permission cannot update a tender project', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $this->actingAs(User::factory()->create(['user_type' => 'internal']), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertStatus(403);
});

test('a non-internal user is not authorized to update even when directly granted the permission', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.update', 'guard_name' => 'web']));
    $this->actingAs($user, 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertStatus(403);
});

test('an internal user with the update permission can update a tender project', function () {
    $creator = User::factory()->create(['user_type' => 'internal']);
    $project = TenderProjects::factory()->status('published')->create([
        'project_code' => 'TP-2026-0001',
        'fiscal_year' => 2026,
        'created_by' => $creator->id,
    ]);
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertOk()
        ->assertJsonPath('data.id', $project->id)
        ->assertJsonPath('data.projectCode', 'TP-2026-0001')
        ->assertJsonPath('data.name', 'จัดซื้อคอมพิวเตอร์ (แก้ไข)')
        ->assertJsonPath('data.status', 'published')
        ->assertJsonMissingPath('data.createdBy');

    $this->assertDatabaseHas('tenders_projects', [
        'id' => $project->id,
        'project_code' => 'TP-2026-0001',
        'name' => 'จัดซื้อคอมพิวเตอร์ (แก้ไข)',
        'description' => 'รายละเอียดใหม่',
        'procurement_method' => 'วิธีคัดเลือก',
        'department_id' => Department::where('name', 'Finance')->value('id'),
        'fiscal_year' => 2026,
        'status' => 'published',
        'created_by' => $creator->id,
    ]);
});

test('changing the fiscal year issues the next project code for the new fiscal year', function () {
    $project = TenderProjects::factory()->status('draft')->create(['project_code' => 'TP-2026-0001', 'fiscal_year' => 2026]);
    TenderProjects::factory()->status('draft')->create(['project_code' => 'TP-2027-0004', 'fiscal_year' => 2027]);
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson(
        "/api/v1/dashboard/tender-projects/{$project->id}",
        validUpdateTenderProjectPayload(['fiscalYear' => 2027]),
    );

    $response->assertOk()->assertJsonPath('data.projectCode', 'TP-2027-0005');
    $this->assertDatabaseHas('tenders_projects', [
        'id' => $project->id,
        'project_code' => 'TP-2027-0005',
        'fiscal_year' => 2027,
    ]);
});

test('updating a nonexistent tender project returns 404', function () {
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson('/api/v1/dashboard/tender-projects/999999', validUpdateTenderProjectPayload());

    $response->assertStatus(404);
});

test('updating a tender project requires the required fields', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors([
            'name', 'budget', 'departmentId', 'procurementMethod', 'fiscalYear', 'projectStartAt', 'projectEndAt',
        ]);
});

test('updating a tender project rejects an end date before the start date', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload([
        'projectStartAt' => '2026-12-31',
        'projectEndAt' => '2026-01-01',
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors(['projectEndAt']);
});

test('updating a tender project clears the optional fields the frontend omits from the payload', function () {
    $project = TenderProjects::factory()->status('draft')->create(['description' => 'รายละเอียดเดิม']);
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $payload = validUpdateTenderProjectPayload();
    unset($payload['description'], $payload['personInChargeId']);

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", $payload);

    $response->assertOk();
    $this->assertDatabaseHas('tenders_projects', [
        'id' => $project->id,
        'description' => null,
        'person_in_charge_id' => null,
    ]);
});

test('updating a tender project can clear the optional fields', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload([
        'description' => null,
        'personInChargeId' => null,
    ]));

    $response->assertOk();
    $this->assertDatabaseHas('tenders_projects', [
        'id' => $project->id,
        'description' => null,
        'person_in_charge_id' => null,
    ]);
});

test('updating a tender project requires the project period', function (array $overrides) {
    $project = TenderProjects::factory()->status('draft')->create();
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson(
        "/api/v1/dashboard/tender-projects/{$project->id}",
        validUpdateTenderProjectPayload($overrides),
    );

    $response->assertStatus(422)->assertJsonValidationErrors(array_keys($overrides));
})->with([
    'both cleared' => [['projectStartAt' => null, 'projectEndAt' => null]],
    'start missing' => [['projectStartAt' => null]],
    'end missing' => [['projectEndAt' => null]],
]);

test('updating a tender project rejects a budget of zero or less', function (int|float $budget) {
    $project = TenderProjects::factory()->status('draft')->create();
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson(
        "/api/v1/dashboard/tender-projects/{$project->id}",
        validUpdateTenderProjectPayload(['budget' => $budget]),
    );

    $response->assertStatus(422)->assertJsonValidationErrors(['budget']);
})->with([0, 0.00, -1]);

test('a finished tender project cannot be edited without tender_projects.manageAnyStatus', function (string $status) {
    $project = TenderProjects::factory()->status($status)->create(['name' => 'ชื่อเดิม']);
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertStatus(422)->assertJsonStructure(['message']);
    $this->assertDatabaseHas('tenders_projects', ['id' => $project->id, 'name' => 'ชื่อเดิม']);
})->with(['completed', 'cancelled', 'archived']);

test('a user with tender_projects.manageAnyStatus can still edit a finished tender project', function () {
    $project = TenderProjects::factory()->status('completed')->create();
    $manager = internalUserWithTenderProjectUpdatePermission();
    $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.manageAnyStatus', 'guard_name' => 'web']));
    $this->actingAs($manager, 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertOk()->assertJsonPath('data.name', 'จัดซื้อคอมพิวเตอร์ (แก้ไข)');
});
