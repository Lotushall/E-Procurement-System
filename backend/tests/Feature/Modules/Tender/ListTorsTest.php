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
 * An internal user with an internal profile in an IT department, so
 * UserResource has nested profile data to render.
 */
function torApiInternalUser(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    InternalProfiles::create([
        'user_id' => $user->id,
        'firstname' => 'Somchai',
        'lastname' => 'Jaidee',
        'department_id' => Department::firstOrCreate(['name' => 'IT'])->id,
    ]);

    return $user;
}

/**
 * @param  list<string>  $permissions
 */
function torApiViewer(array $permissions = ['tors.viewAny']): User
{
    $user = torApiInternalUser();

    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    return $user;
}

/**
 * @param  array<string, mixed>  $attributes
 */
function torForApiTest(array $attributes = []): Tors
{
    return Tors::factory()->create([
        'tender_project_id' => null,
        'created_by' => null,
        ...$attributes,
    ]);
}

test('listing TORs requires authentication', function () {
    $this->getJson('/api/v1/dashboard/tors')->assertStatus(401);
});

test('an internal user without a TOR view permission cannot list TORs', function () {
    $this->actingAs(torApiViewer([]), 'web');

    $this->getJson('/api/v1/dashboard/tors')->assertStatus(403);
});

test('a vendor user cannot list TORs even when granted tors.viewAny', function () {
    $vendor = User::factory()->create(['user_type' => 'company']);
    $vendor->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.viewAny', 'guard_name' => 'web']));
    $this->actingAs($vendor, 'web');

    $this->getJson('/api/v1/dashboard/tors')->assertStatus(403);
});

test('the TOR list returns every key and uses null for missing values', function () {
    $this->actingAs(torApiViewer(), 'web');
    $project = TenderProjects::factory()->create(['project_code' => 'TP-2569-0001', 'name' => 'จัดซื้อคอมพิวเตอร์']);
    $approver = torApiInternalUser();

    torForApiTest([
        'tor_code' => 'TOR-2569-0001',
        'status' => 'draft',
        'created_by' => torApiInternalUser()->id,
        'approved_by' => null,
        'approved_at' => null,
        'bidding_start_at' => null,
        'bidding_end_at' => null,
        'remark' => null,
        'created_at' => now()->subDay(),
    ]);
    torForApiTest([
        'tor_code' => 'TOR-2569-0002',
        'status' => 'bidding',
        'tender_project_id' => $project->id,
        'created_by' => torApiInternalUser()->id,
        'approved_by' => $approver->id,
        'budget_estimate' => '500000.00',
        'fiscal_year' => 2569,
        'created_at' => now(),
    ]);

    $this->getJson('/api/v1/dashboard/tors')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [[
                'id', 'torCode', 'title', 'scopeOfWork', 'budgetEstimate', 'procurementMethod',
                'fiscalYear', 'biddingStartAt', 'biddingEndAt', 'status', 'remark', 'approvedAt',
                'createdAt', 'department', 'tenderProject', 'createdBy', 'approvedBy',
            ]],
            'meta' => ['currentPage', 'lastPage', 'perPage', 'total'],
        ])
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('meta.currentPage', 1)
        ->assertJsonPath('meta.perPage', 20)
        ->assertJsonPath('data.0.torCode', 'TOR-2569-0002')
        ->assertJsonPath('data.0.budgetEstimate', '500000.00')
        ->assertJsonPath('data.0.fiscalYear', 2569)
        ->assertJsonPath('data.0.status', 'bidding')
        ->assertJsonPath('data.0.tenderProject', [
            'id' => $project->id,
            'projectCode' => 'TP-2569-0001',
            'name' => 'จัดซื้อคอมพิวเตอร์',
        ])
        ->assertJsonPath('data.0.approvedBy', [
            'id' => $approver->id,
            'name' => 'Somchai Jaidee',
            'department' => ['id' => Department::where('name', 'IT')->value('id'), 'name' => 'IT'],
        ])
        ->assertJsonMissingPath('data.0.approvedBy.email')
        ->assertJsonPath('data.1.torCode', 'TOR-2569-0001')
        ->assertJsonPath('data.1.tenderProject', null)
        ->assertJsonPath('data.1.approvedBy', null)
        ->assertJsonPath('data.1.approvedAt', null)
        ->assertJsonPath('data.1.biddingStartAt', null)
        ->assertJsonPath('data.1.biddingEndAt', null)
        ->assertJsonPath('data.1.remark', null);
});

test('the TOR list passes filters through to the query', function () {
    $this->actingAs(torApiViewer(), 'web');
    $project = TenderProjects::factory()->create();
    torForApiTest(['status' => 'bidding', 'tender_project_id' => $project->id]);
    $target = torForApiTest(['status' => 'bidding']);
    torForApiTest(['status' => 'draft']);

    $this->getJson('/api/v1/dashboard/tors?status=bidding&tender_project_id=none')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $target->id);
});

test('the TOR list filters by the published status', function () {
    $this->actingAs(torApiViewer(), 'web');
    $target = torForApiTest(['status' => 'published']);
    torForApiTest(['status' => 'bidding']);

    $this->getJson('/api/v1/dashboard/tors?status=published')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $target->id);
});

test('the TOR list only returns TORs the viewer may see', function () {
    $viewer = torApiViewer(['tors.viewOwn']);
    $this->actingAs($viewer, 'web');
    $mine = torForApiTest(['created_by' => $viewer->id]);
    torForApiTest();

    $this->getJson('/api/v1/dashboard/tors')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $mine->id);
});

test('the TOR list rejects invalid query parameters', function (string $query, string $field) {
    $this->actingAs(torApiViewer(), 'web');

    $this->getJson('/api/v1/dashboard/tors?'.$query)
        ->assertStatus(422)
        ->assertJsonValidationErrors([$field]);
})->with([
    'unknown status' => ['status=evaluation', 'status'],
    'unknown sort column' => ['sort_by=remark', 'sort_by'],
    'bad sort direction' => ['sort_direction=up', 'sort_direction'],
    'non-numeric project' => ['tender_project_id=abc', 'tender_project_id'],
    'missing project' => ['tender_project_id=999999', 'tender_project_id'],
    'missing department' => ['department_id=999999', 'department_id'],
    'per page over 100' => ['per_page=101', 'per_page'],
]);
