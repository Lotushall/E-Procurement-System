<?php

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function internalUserWithTenderProjectUpdateStatusPermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.updateStatus', 'guard_name' => 'web']));

    return $user;
}

dataset('tender project status transitions', function () {
    $statuses = ['draft', 'published', 'closed', 'completed', 'cancelled', 'archived'];

    foreach ($statuses as $from) {
        foreach ($statuses as $to) {
            if ($from !== $to) {
                yield "{$from} -> {$to}" => [$from, $to];
            }
        }
    }
});

test('changing a tender project status requires authentication', function () {
    $project = TenderProjects::factory()->status('draft')->create();

    $response = $this->patchJson("/api/v1/dashboard/tender-projects/{$project->id}/status", ['status' => 'published']);

    $response->assertStatus(401);
});

test('an internal user without the updateStatus permission cannot change a tender project status', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $this->actingAs(User::factory()->create(['user_type' => 'internal']), 'web');

    $response = $this->patchJson("/api/v1/dashboard/tender-projects/{$project->id}/status", ['status' => 'published']);

    $response->assertStatus(403);
});

test('the update permission alone does not allow changing a tender project status', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.update', 'guard_name' => 'web']));
    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/dashboard/tender-projects/{$project->id}/status", ['status' => 'published']);

    $response->assertStatus(403);
});

test('a non-internal user is not authorized to change a tender project status even when directly granted the permission', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.updateStatus', 'guard_name' => 'web']));
    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/dashboard/tender-projects/{$project->id}/status", ['status' => 'published']);

    $response->assertStatus(403);
});

test('an internal user with the updateStatus permission can change a tender project status without touching other fields', function () {
    $project = TenderProjects::factory()->status('draft')->create([
        'project_code' => 'TP-2569-0001',
        'name' => 'จัดซื้อครุภัณฑ์คอมพิวเตอร์',
        'fiscal_year' => 2569,
    ]);
    $this->actingAs(internalUserWithTenderProjectUpdateStatusPermission(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/tender-projects/{$project->id}/status", ['status' => 'published']);

    $response->assertOk()
        ->assertJsonPath('data.id', $project->id)
        ->assertJsonPath('data.projectCode', 'TP-2569-0001')
        ->assertJsonPath('data.status', 'published');

    $this->assertDatabaseHas('tenders_projects', [
        'id' => $project->id,
        'project_code' => 'TP-2569-0001',
        'name' => 'จัดซื้อครุภัณฑ์คอมพิวเตอร์',
        'fiscal_year' => 2569,
        'status' => 'published',
    ]);
});

test('any tender project status can change directly to any other status', function (string $from, string $to) {
    $project = TenderProjects::factory()->status($from)->create();
    $this->actingAs(internalUserWithTenderProjectUpdateStatusPermission(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/tender-projects/{$project->id}/status", ['status' => $to]);

    $response->assertOk()->assertJsonPath('data.status', $to);
    $this->assertDatabaseHas('tenders_projects', ['id' => $project->id, 'status' => $to]);
})->with('tender project status transitions');

test('changing a tender project to its current status is rejected with 422', function () {
    $project = TenderProjects::factory()->status('published')->create();
    $this->actingAs(internalUserWithTenderProjectUpdateStatusPermission(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/tender-projects/{$project->id}/status", ['status' => 'published']);

    $response->assertStatus(422)->assertJsonStructure(['message']);
    $this->assertDatabaseHas('tenders_projects', ['id' => $project->id, 'status' => 'published']);
});

test('an invalid tender project status value is rejected with a validation error', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $this->actingAs(internalUserWithTenderProjectUpdateStatusPermission(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/tender-projects/{$project->id}/status", ['status' => 'awarded']);

    $response->assertInvalid('status');
    $this->assertDatabaseHas('tenders_projects', ['id' => $project->id, 'status' => 'draft']);
});

test('changing a tender project status requires the status field', function () {
    $project = TenderProjects::factory()->status('draft')->create();
    $this->actingAs(internalUserWithTenderProjectUpdateStatusPermission(), 'web');

    $response = $this->patchJson("/api/v1/dashboard/tender-projects/{$project->id}/status", []);

    $response->assertInvalid('status');
});

test('changing the status of a nonexistent tender project returns 404', function () {
    $this->actingAs(internalUserWithTenderProjectUpdateStatusPermission(), 'web');

    $response = $this->patchJson('/api/v1/dashboard/tender-projects/999999/status', ['status' => 'published']);

    $response->assertStatus(404);
});
