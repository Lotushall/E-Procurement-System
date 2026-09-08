<?php

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function internalUserWithTenderProjectDeletePermission(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.delete', 'guard_name' => 'web']));

    return $user;
}

test('deleting a tender project requires authentication', function () {
    $project = TenderProjects::factory()->create();

    $response = $this->deleteJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertStatus(401);
});

test('an internal user without the delete permission cannot delete a tender project', function () {
    $project = TenderProjects::factory()->create();
    $user = User::factory()->create(['user_type' => 'internal']);
    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertStatus(403);
});

test('an internal user with the delete permission can delete a tender project', function () {
    $project = TenderProjects::factory()->create();
    $this->actingAs(internalUserWithTenderProjectDeletePermission(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('tenders_projects', ['id' => $project->id]);
});

test('a non-internal user is not authorized to delete even when directly granted the permission', function () {
    $project = TenderProjects::factory()->create();
    $user = User::factory()->create(['user_type' => 'company']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tender_projects.delete', 'guard_name' => 'web']));
    $this->actingAs($user, 'web');

    $response = $this->deleteJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertStatus(403);
});

test('deleting a tender project is unconditional regardless of status', function () {
    $project = TenderProjects::factory()->status('published')->create();
    $this->actingAs(internalUserWithTenderProjectDeletePermission(), 'web');

    $response = $this->deleteJson("/api/v1/dashboard/tender-projects/{$project->id}");

    $response->assertStatus(204);
    $this->assertDatabaseMissing('tenders_projects', ['id' => $project->id]);
});

test('deleting a nonexistent tender project returns 404', function () {
    $this->actingAs(internalUserWithTenderProjectDeletePermission(), 'web');

    $response = $this->deleteJson('/api/v1/dashboard/tender-projects/999999');

    $response->assertStatus(404);
});
