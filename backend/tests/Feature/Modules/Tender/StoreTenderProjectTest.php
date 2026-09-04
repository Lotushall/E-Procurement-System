<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function internalUserWithTenderProjectCreatePermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.create', 'guard_name' => 'web']));

    return $user;
}

function validTenderProjectPayload(array $overrides = []): array
{
    $department = Department::firstOrCreate(['name' => 'IT']);

    return array_merge([
        'name' => 'จัดซื้อคอมพิวเตอร์',
        'description' => 'รายละเอียดโครงการ',
        'budget' => 500000,
        'departmentId' => $department->id,
        'personInChargeId' => null,
        'procurementMethod' => 'e-bidding',
        'fiscalYear' => 2569,
        'projectStartAt' => '2026-09-01',
        'projectEndAt' => '2026-12-31',
    ], $overrides);
}

test('creating a tender project requires authentication', function () {
    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());

    $response->assertStatus(401);
});

test('an internal user without the permission cannot create a tender project', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());

    $response->assertStatus(403);
});

test('an internal user with the permission can create a tender project', function () {
    $user = internalUserWithTenderProjectCreatePermission();
    $this->actingAs($user, 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());

    $response->assertStatus(201)
        ->assertJsonPath('data.projectCode', 'TP-2569-0001')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.name', 'จัดซื้อคอมพิวเตอร์')
        ->assertJsonPath('data.createdBy', $user->id);

    $this->assertDatabaseHas('tenders_projects', [
        'project_code' => 'TP-2569-0001',
        'status' => 'draft',
        'created_by' => $user->id,
    ]);
});

test('the project code sequence increments for a second project in the same fiscal year', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());
    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());

    $response->assertJsonPath('data.projectCode', 'TP-2569-0002');
});

test('the project code sequence resets to 0001 for a new fiscal year', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload());
    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload(['fiscalYear' => 2570]));

    $response->assertJsonPath('data.projectCode', 'TP-2570-0001');
});

test('creating a tender project requires the required fields', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'budget', 'departmentId', 'procurementMethod', 'fiscalYear']);
});

test('creating a tender project rejects a nonexistent department', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload(['departmentId' => 999999]));

    $response->assertStatus(422)->assertJsonValidationErrors(['departmentId']);
});

test('creating a tender project rejects a nonexistent person in charge', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload(['personInChargeId' => 999999]));

    $response->assertStatus(422)->assertJsonValidationErrors(['personInChargeId']);
});

test('creating a tender project rejects an end date before the start date', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload([
        'projectStartAt' => '2026-12-31',
        'projectEndAt' => '2026-01-01',
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors(['projectEndAt']);
});

test('creating a tender project rejects a budget with more than 2 decimal places', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload([
        'budget' => 100.999,
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors(['budget']);
});

test('creating a tender project rejects a negative fiscal year', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload([
        'fiscalYear' => -1,
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors(['fiscalYear']);
});

test('accepts a valid person in charge', function () {
    $this->actingAs(internalUserWithTenderProjectCreatePermission(), 'web');
    $department = Department::firstOrCreate(['name' => 'IT']);
    $profileUser = User::factory()->create(['user_type' => 'internal']);
    $profile = InternalProfiles::create([
        'user_id' => $profileUser->id,
        'firstname' => 'A',
        'lastname' => 'B',
        'department_id' => $department->id,
    ]);

    $response = $this->postJson('/api/v1/dashboard/tender-projects', validTenderProjectPayload([
        'personInChargeId' => $profile->id,
    ]));

    $response->assertStatus(201)->assertJsonPath('data.personInChargeId', $profile->id);
});
