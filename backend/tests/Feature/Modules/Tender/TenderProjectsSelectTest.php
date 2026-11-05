<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function internalUserForTenderProjectOptions(): User
{
    return User::factory()->create(['user_type' => 'internal']);
}

test('fetching tender project select options requires authentication', function () {
    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertStatus(401);
});

test('a vendor user cannot fetch tender project select options', function () {
    $user = User::factory()->create(['user_type' => 'company']);
    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertStatus(403);
});

test('an internal user with no role or permission can fetch tender project select options', function () {
    TenderProjects::factory()->create();
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertOk()->assertJsonCount(1, 'data');
});

test('tender project select options include only id, projectCode and name, ordered by projectCode', function () {
    $second = TenderProjects::factory()->create(['project_code' => 'TP-2026-0002', 'name' => 'จัดซื้อวัสดุสำนักงาน']);
    $first = TenderProjects::factory()->create(['project_code' => 'TP-2026-0001', 'name' => 'จัดซื้อยานพาหนะ']);
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertOk()->assertExactJson([
        'data' => [
            ['id' => $first->id, 'projectCode' => 'TP-2026-0001', 'name' => 'จัดซื้อยานพาหนะ'],
            ['id' => $second->id, 'projectCode' => 'TP-2026-0002', 'name' => 'จัดซื้อวัสดุสำนักงาน'],
        ],
    ]);
});

test('department_id keeps only the projects of that department', function () {
    $it = Department::firstOrCreate(['name' => 'IT']);
    $finance = Department::firstOrCreate(['name' => 'การเงิน']);
    $ours = TenderProjects::factory()->create(['department_id' => $it->id]);
    TenderProjects::factory()->create(['department_id' => $finance->id]);
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson("/api/v1/dashboard/tender-projects/select?department_id={$it->id}");

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ours->id);
});

test('open_for_tor keeps only the projects that still take new TORs', function () {
    foreach (['draft', 'published', 'closed', 'completed', 'cancelled', 'archived'] as $status) {
        TenderProjects::factory()->status($status)->create(['project_code' => "TP-{$status}"]);
    }
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select?open_for_tor=1');

    $response->assertOk();
    expect(array_column($response->json('data'), 'projectCode'))->toBe(['TP-draft', 'TP-published']);
});

test('department_id and open_for_tor combine', function () {
    $it = Department::firstOrCreate(['name' => 'IT']);
    $finance = Department::firstOrCreate(['name' => 'การเงิน']);
    $wanted = TenderProjects::factory()->status('draft')->create(['department_id' => $it->id]);
    TenderProjects::factory()->status('closed')->create(['department_id' => $it->id]);
    TenderProjects::factory()->status('draft')->create(['department_id' => $finance->id]);
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson("/api/v1/dashboard/tender-projects/select?department_id={$it->id}&open_for_tor=1");

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $wanted->id);
});

test('an unknown department_id or a non-boolean open_for_tor is rejected', function () {
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $this->getJson('/api/v1/dashboard/tender-projects/select?department_id=999999')
        ->assertStatus(422)
        ->assertJsonValidationErrors('department_id');

    $this->getJson('/api/v1/dashboard/tender-projects/select?open_for_tor=maybe')
        ->assertStatus(422)
        ->assertJsonValidationErrors('open_for_tor');
});

test('tender project select options include projects of every status', function () {
    foreach (['draft', 'published', 'closed', 'completed', 'cancelled', 'archived'] as $status) {
        TenderProjects::factory()->status($status)->create();
    }
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertOk()->assertJsonCount(6, 'data');
});
