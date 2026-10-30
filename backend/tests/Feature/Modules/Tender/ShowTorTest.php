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
function showTorViewer(array $permissions): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    return $user;
}

test('showing a TOR requires authentication', function () {
    $this->getJson('/api/v1/dashboard/tors/1')->assertStatus(401);
});

test('an internal user without a TOR view permission cannot show a TOR', function () {
    $this->actingAs(showTorViewer([]), 'web');
    $tor = Tors::factory()->create(['created_by' => null, 'tender_project_id' => null]);

    $this->getJson('/api/v1/dashboard/tors/'.$tor->id)->assertStatus(403);
});

test('showing a visible TOR returns it with every key', function () {
    $this->actingAs(showTorViewer(['tors.viewAny']), 'web');
    $tor = Tors::factory()->create([
        'tor_code' => 'TOR-2569-0007',
        'status' => 'draft',
        'created_by' => null,
        'tender_project_id' => null,
        'approved_by' => null,
    ]);

    $this->getJson('/api/v1/dashboard/tors/'.$tor->id)
        ->assertOk()
        ->assertJsonStructure(['data' => [
            'id', 'torCode', 'title', 'scopeOfWork', 'budgetEstimate', 'procurementMethod',
            'fiscalYear', 'biddingStartAt', 'biddingEndAt', 'status', 'remark', 'approvedAt',
            'createdAt', 'department', 'tenderProject', 'createdBy', 'approvedBy',
        ]])
        ->assertJsonPath('data.id', $tor->id)
        ->assertJsonPath('data.torCode', 'TOR-2569-0007')
        ->assertJsonPath('data.department.id', $tor->department_id)
        ->assertJsonPath('data.tenderProject', null)
        ->assertJsonPath('data.createdBy', null)
        ->assertJsonPath('data.approvedBy', null);
});

test('showing a TOR that does not exist returns 404', function () {
    $this->actingAs(showTorViewer(['tors.viewAny']), 'web');

    $this->getJson('/api/v1/dashboard/tors/999999')->assertStatus(404);
});

test('showing an existing TOR outside the viewer visibility returns 404', function () {
    $this->actingAs(showTorViewer(['tors.viewOwn']), 'web');
    $tor = Tors::factory()->create(['created_by' => null, 'tender_project_id' => null]);

    $this->getJson('/api/v1/dashboard/tors/'.$tor->id)->assertStatus(404);
});

function showTorViewerWithProfile(string $firstname, string $lastname, Department $department): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    InternalProfiles::create([
        'user_id' => $user->id,
        'firstname' => $firstname,
        'lastname' => $lastname,
        'department_id' => $department->id,
    ]);

    return $user;
}

test('showing a TOR with an invalid or oversized id returns 404', function (string $id) {
    $this->actingAs(showTorViewer(['tors.viewAny']), 'web');

    $this->getJson('/api/v1/dashboard/tors/'.$id)->assertStatus(404);
})->with(['non-numeric' => 'abc', 'too large for an integer' => '99999999999999999999']);

test('showing a TOR renders createdBy, approvedBy and tenderProject as slim summaries', function () {
    $this->actingAs(showTorViewer(['tors.viewAny']), 'web');
    $department = Department::firstOrCreate(['name' => 'IT']);
    $creator = showTorViewerWithProfile('Somchai', 'Jaidee', $department);
    $approver = showTorViewerWithProfile('Malee', 'Rakdee', $department);
    $project = TenderProjects::factory()->create(['project_code' => 'TP-2569-0009', 'name' => 'จัดซื้อเซิร์ฟเวอร์']);
    $tor = Tors::factory()->create([
        'created_by' => $creator->id,
        'approved_by' => $approver->id,
        'tender_project_id' => $project->id,
    ]);

    $this->getJson('/api/v1/dashboard/tors/'.$tor->id)
        ->assertOk()
        ->assertJsonPath('data.createdBy', [
            'id' => $creator->id,
            'name' => 'Somchai Jaidee',
            'department' => ['id' => $department->id, 'name' => 'IT'],
        ])
        ->assertJsonPath('data.approvedBy', [
            'id' => $approver->id,
            'name' => 'Malee Rakdee',
            'department' => ['id' => $department->id, 'name' => 'IT'],
        ])
        ->assertJsonPath('data.tenderProject', [
            'id' => $project->id,
            'projectCode' => 'TP-2569-0009',
            'name' => 'จัดซื้อเซิร์ฟเวอร์',
        ])
        ->assertJsonMissingPath('data.createdBy.email');
});

test('showing a TOR whose creator has no internal profile returns a null name and department', function () {
    $this->actingAs(showTorViewer(['tors.viewAny']), 'web');
    $creator = User::factory()->create(['user_type' => 'internal']);
    $tor = Tors::factory()->create([
        'created_by' => $creator->id,
        'approved_by' => null,
        'tender_project_id' => null,
    ]);

    $this->getJson('/api/v1/dashboard/tors/'.$tor->id)
        ->assertOk()
        ->assertJsonPath('data.createdBy', ['id' => $creator->id, 'name' => null, 'department' => null]);
});
