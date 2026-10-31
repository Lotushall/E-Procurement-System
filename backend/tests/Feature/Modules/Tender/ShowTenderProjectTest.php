<?php

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

/**
 * @param  list<string>  $permissions
 */
function tenderProjectViewerWith(array $permissions): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    foreach (['tender_projects.viewAny', ...$permissions] as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    return $user;
}

test('showing a tender project includes its TORs in the summary shape, ordered by torCode', function () {
    $project = TenderProjects::factory()->create();
    $second = Tors::factory()->status('bidding')->create([
        'tender_project_id' => $project->id,
        'tor_code' => 'TOR-2569-0002',
        'budget_estimate' => 150000,
    ]);
    $first = Tors::factory()->status('draft')->create([
        'tender_project_id' => $project->id,
        'tor_code' => 'TOR-2569-0001',
        'bidding_start_at' => null,
        'bidding_end_at' => '2026-12-01 10:00:00',
    ]);
    $this->actingAs(tenderProjectViewerWith(['tors.viewAny']), 'web');

    $response = $this->getJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertOk()
        ->assertJsonCount(2, 'data.tors')
        ->assertJsonPath('data.tors.0', [
            'id' => $first->id,
            'torCode' => 'TOR-2569-0001',
            'title' => $first->title,
            'procurementMethod' => $first->procurement_method,
            'budgetEstimate' => $first->fresh()->budget_estimate,
            'biddingStartAt' => null,
            'biddingEndAt' => $first->fresh()->bidding_end_at->toIso8601String(),
            'status' => 'draft',
        ])
        ->assertJsonPath('data.tors.1.id', $second->id)
        ->assertJsonPath('data.tors.1.budgetEstimate', '150000.00')
        ->assertJsonPath('data.tors.1.biddingStartAt', $second->fresh()->bidding_start_at->toIso8601String())
        ->assertJsonPath('data.tors.1.biddingEndAt', $second->fresh()->bidding_end_at->toIso8601String());
});

test('showing a tender project excludes TORs of other projects', function () {
    $project = TenderProjects::factory()->create();
    $otherProject = TenderProjects::factory()->create();
    $own = Tors::factory()->create(['tender_project_id' => $project->id]);
    Tors::factory()->create(['tender_project_id' => $otherProject->id]);
    Tors::factory()->create(['tender_project_id' => null]);
    $this->actingAs(tenderProjectViewerWith(['tors.viewAny']), 'web');

    $response = $this->getJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertOk()
        ->assertJsonCount(1, 'data.tors')
        ->assertJsonPath('data.tors.0.id', $own->id);
});

test('a viewer with only tors.viewOwn sees only the TORs they created', function () {
    $viewer = tenderProjectViewerWith(['tors.viewOwn']);
    $someoneElse = User::factory()->create(['user_type' => 'internal']);
    $project = TenderProjects::factory()->create();
    $mine = Tors::factory()->create(['tender_project_id' => $project->id, 'created_by' => $viewer->id]);
    Tors::factory()->create(['tender_project_id' => $project->id, 'created_by' => $someoneElse->id]);
    $this->actingAs($viewer, 'web');

    $response = $this->getJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertOk()
        ->assertJsonCount(1, 'data.tors')
        ->assertJsonPath('data.tors.0.id', $mine->id);
});

test('a viewer without any TOR view permission gets an empty TOR list', function () {
    $project = TenderProjects::factory()->create();
    Tors::factory()->create(['tender_project_id' => $project->id]);
    $this->actingAs(tenderProjectViewerWith([]), 'web');

    $response = $this->getJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertOk()->assertJsonPath('data.tors', []);
});

test('showing a tender project includes the allocated budget of every non-cancelled TOR, even ones the viewer cannot see', function () {
    $viewer = tenderProjectViewerWith(['tors.viewOwn']);
    $someoneElse = User::factory()->create(['user_type' => 'internal']);
    $project = TenderProjects::factory()->create();
    Tors::factory()->status('draft')->create(['tender_project_id' => $project->id, 'created_by' => $viewer->id, 'budget_estimate' => 100000]);
    Tors::factory()->status('bidding')->create(['tender_project_id' => $project->id, 'created_by' => $someoneElse->id, 'budget_estimate' => 250000.25]);
    Tors::factory()->status('cancelled')->create(['tender_project_id' => $project->id, 'created_by' => $someoneElse->id, 'budget_estimate' => 999999]);
    Tors::factory()->create(['tender_project_id' => TenderProjects::factory()->create()->id, 'budget_estimate' => 777777]);
    $this->actingAs($viewer, 'web');

    $response = $this->getJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertOk()
        ->assertJsonCount(1, 'data.tors')
        ->assertJsonPath('data.allocatedBudget', '350000.25');
});

test('a tender project without TORs has an allocated budget of zero', function () {
    $project = TenderProjects::factory()->create();
    $this->actingAs(tenderProjectViewerWith([]), 'web');

    $response = $this->getJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertOk()->assertJsonPath('data.allocatedBudget', '0.00');
});

test('listing tender projects does not include TORs', function () {
    $project = TenderProjects::factory()->create();
    Tors::factory()->create(['tender_project_id' => $project->id]);
    $this->actingAs(tenderProjectViewerWith(['tors.viewAny']), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects');

    $response->assertOk()->assertJsonMissingPath('data.0.tors');
});
