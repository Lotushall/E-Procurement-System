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
        'fiscalYear' => 2569,
        'projectStartAt' => '2026-10-01',
        'projectEndAt' => '2027-03-31',
    ], $overrides);
}

test('updating a tender project requires authentication', function () {
    $project = TenderProjects::factory()->create();

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertStatus(401);
});

test('an internal user without the update permission cannot update a tender project', function () {
    $project = TenderProjects::factory()->create();
    $this->actingAs(User::factory()->create(['user_type' => 'internal']), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertStatus(403);
});

test('a non-internal user is not authorized to update even when directly granted the permission', function () {
    $project = TenderProjects::factory()->create();
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.update', 'guard_name' => 'web']));
    $this->actingAs($user, 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertStatus(403);
});

test('an internal user with the update permission can update a tender project', function () {
    $creator = User::factory()->create(['user_type' => 'internal']);
    $project = TenderProjects::factory()->status('published')->create([
        'project_code' => 'TP-2569-0001',
        'fiscal_year' => 2569,
        'created_by' => $creator->id,
    ]);
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload());

    $response->assertOk()
        ->assertJsonPath('data.id', $project->id)
        ->assertJsonPath('data.projectCode', 'TP-2569-0001')
        ->assertJsonPath('data.name', 'จัดซื้อคอมพิวเตอร์ (แก้ไข)')
        ->assertJsonPath('data.status', 'published')
        ->assertJsonPath('data.createdBy.id', $creator->id);

    $this->assertDatabaseHas('tenders_projects', [
        'id' => $project->id,
        'project_code' => 'TP-2569-0001',
        'name' => 'จัดซื้อคอมพิวเตอร์ (แก้ไข)',
        'description' => 'รายละเอียดใหม่',
        'procurement_method' => 'วิธีคัดเลือก',
        'department_id' => Department::where('name', 'Finance')->value('id'),
        'fiscal_year' => 2569,
        'status' => 'published',
        'created_by' => $creator->id,
    ]);
});

test('changing the fiscal year issues the next project code for the new fiscal year', function () {
    $project = TenderProjects::factory()->create(['project_code' => 'TP-2569-0001', 'fiscal_year' => 2569]);
    TenderProjects::factory()->create(['project_code' => 'TP-2570-0004', 'fiscal_year' => 2570]);
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson(
        "/api/v1/dashboard/tender-projects/{$project->id}",
        validUpdateTenderProjectPayload(['fiscalYear' => 2570]),
    );

    $response->assertOk()->assertJsonPath('data.projectCode', 'TP-2570-0005');
    $this->assertDatabaseHas('tenders_projects', [
        'id' => $project->id,
        'project_code' => 'TP-2570-0005',
        'fiscal_year' => 2570,
    ]);
});

test('updating a nonexistent tender project returns 404', function () {
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson('/api/v1/dashboard/tender-projects/999999', validUpdateTenderProjectPayload());

    $response->assertStatus(404);
});

test('updating a tender project requires the required fields', function () {
    $project = TenderProjects::factory()->create();
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'budget', 'departmentId', 'procurementMethod', 'fiscalYear']);
});

test('updating a tender project rejects an end date before the start date', function () {
    $project = TenderProjects::factory()->create();
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload([
        'projectStartAt' => '2026-12-31',
        'projectEndAt' => '2026-01-01',
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors(['projectEndAt']);
});

test('updating a tender project clears the optional fields the frontend omits from the payload', function () {
    $project = TenderProjects::factory()->create(['description' => 'รายละเอียดเดิม']);
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $payload = validUpdateTenderProjectPayload();
    unset($payload['description'], $payload['personInChargeId'], $payload['projectStartAt'], $payload['projectEndAt']);

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", $payload);

    $response->assertOk();
    $this->assertDatabaseHas('tenders_projects', [
        'id' => $project->id,
        'description' => null,
        'person_in_charge_id' => null,
        'project_start_at' => null,
        'project_end_at' => null,
    ]);
});

test('updating a tender project can clear the optional fields', function () {
    $project = TenderProjects::factory()->create();
    $this->actingAs(internalUserWithTenderProjectUpdatePermission(), 'web');

    $response = $this->putJson("/api/v1/dashboard/tender-projects/{$project->id}", validUpdateTenderProjectPayload([
        'description' => null,
        'projectStartAt' => null,
        'projectEndAt' => null,
    ]));

    $response->assertOk();
    $this->assertDatabaseHas('tenders_projects', [
        'id' => $project->id,
        'description' => null,
        'project_start_at' => null,
        'project_end_at' => null,
    ]);
});
