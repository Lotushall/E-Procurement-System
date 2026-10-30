<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function internalUserWithTenderProjectViewAnyPermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.viewAny', 'guard_name' => 'web']));

    return $user;
}

test('listing tender projects requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertStatus(401);
});

test('an internal user without the viewAny permission cannot list tender projects', function () {
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertStatus(403);
});

test('an internal user with the viewAny permission can list tender projects', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->create();
    TenderProjects::factory()->create();

    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'projectCode', 'name', 'budget', 'department' => ['id', 'name'], 'procurementMethod', 'fiscalYear', 'status']],
            'meta' => [
                'currentPage', 'lastPage', 'perPage', 'total',
                'stats' => ['totalCount', 'totalBudget', 'inProgressCount', 'completedCount'],
            ],
        ])
        ->assertJsonMissingPath('data.0.createdBy');
});

test('listing tender projects searches by name', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->create(['name' => 'จัดซื้อคอมพิวเตอร์โน้ตบุ๊ก']);
    TenderProjects::factory()->create(['name' => 'จัดจ้างทำความสะอาด']);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?search='.urlencode('โน้ตบุ๊ก'));

    $response->assertOk()->assertJsonCount(1, 'data');
});

test('listing tender projects searches by project code', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    $target = TenderProjects::factory()->create(['project_code' => 'TP-2569-0042']);
    TenderProjects::factory()->create(['project_code' => 'TP-2569-0043']);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?search=TP-2569-0042');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $target->id);
});

test('listing tender projects filters by status', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->create(['status' => 'draft']);
    TenderProjects::factory()->create(['status' => 'published']);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?status=published');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.status', 'published');
});

test('listing tender projects filters by department', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    $it = Department::firstOrCreate(['name' => 'IT']);
    $hr = Department::firstOrCreate(['name' => 'HR']);
    TenderProjects::factory()->create(['department_id' => $it->id]);
    TenderProjects::factory()->create(['department_id' => $hr->id]);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?department_id='.$hr->id);

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.department.id', $hr->id);
});

test('listing tender projects filters by fiscal year', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->create(['fiscal_year' => 2569]);
    TenderProjects::factory()->create(['fiscal_year' => 2570]);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?fiscal_year=2570');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.fiscalYear', 2570);
});

test('listing tender projects sorts by the given column', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->create(['name' => 'Bravo Project']);
    TenderProjects::factory()->create(['name' => 'Alpha Project']);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?sort_by=name&sort_direction=asc');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('name')->toArray())->toBe(['Alpha Project', 'Bravo Project']);
});

test('listing tender projects returns camelCase pagination meta', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->create();
    TenderProjects::factory()->create();
    TenderProjects::factory()->create();

    $response = $this->getJson('/api/v1/dashboard/tender-projects?page=1&per_page=2');

    $response->assertOk()
        ->assertJson(['meta' => ['currentPage' => 1, 'lastPage' => 2, 'perPage' => 2, 'total' => 3]]);
});

test('an invalid status value is rejected', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects?status=bogus');

    $response->assertStatus(422);
});

test('an invalid sort_by value is rejected', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects?sort_by=description');

    $response->assertStatus(422);
});

test('listing tender projects includes description, person in charge, dates, and formatted budget when present', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    $department = Department::firstOrCreate(['name' => 'IT']);
    $profileUser = User::factory()->create(['user_type' => 'internal']);
    $profile = InternalProfiles::create([
        'user_id' => $profileUser->id,
        'firstname' => 'A',
        'lastname' => 'B',
        'department_id' => $department->id,
    ]);
    $startAt = CarbonImmutable::parse('2026-09-01 00:00:00');
    $endAt = CarbonImmutable::parse('2026-12-31 00:00:00');

    TenderProjects::factory()->create([
        'description' => 'รายละเอียดโครงการ',
        'person_in_charge_id' => $profile->id,
        'budget' => 500000,
        'project_start_at' => $startAt,
        'project_end_at' => $endAt,
    ]);

    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertOk()
        ->assertJsonPath('data.0.description', 'รายละเอียดโครงการ')
        ->assertJsonPath('data.0.personInCharge', ['id' => $profile->id, 'firstname' => 'A', 'lastname' => 'B'])
        ->assertJsonPath('data.0.budget', '500000.00')
        ->assertJsonPath('data.0.projectStartAt', fn (string $value) => CarbonImmutable::parse($value)->equalTo($startAt))
        ->assertJsonPath('data.0.projectEndAt', fn (string $value) => CarbonImmutable::parse($value)->equalTo($endAt));
});

test('listing tender projects returns global stats unaffected by the list filters', function () {
    $this->actingAs(internalUserWithTenderProjectViewAnyPermission(), 'web');
    TenderProjects::factory()->status('draft')->create(['budget' => 100000]);
    TenderProjects::factory()->status('published')->create(['budget' => 200000]);
    TenderProjects::factory()->status('published')->create(['budget' => 300000]);
    TenderProjects::factory()->status('completed')->create(['budget' => 400000]);

    $response = $this->getJson('/api/v1/dashboard/tender-projects?status=published');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJson(['meta' => ['stats' => [
            'totalCount' => 4,
            'totalBudget' => 1000000.0,
            'inProgressCount' => 2,
            'completedCount' => 1,
        ]]]);
});
