<?php

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
    $second = TenderProjects::factory()->create(['project_code' => 'TP-2569-0002', 'name' => 'จัดซื้อวัสดุสำนักงาน']);
    $first = TenderProjects::factory()->create(['project_code' => 'TP-2569-0001', 'name' => 'จัดซื้อยานพาหนะ']);
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertOk()->assertExactJson([
        'data' => [
            ['id' => $first->id, 'projectCode' => 'TP-2569-0001', 'name' => 'จัดซื้อยานพาหนะ'],
            ['id' => $second->id, 'projectCode' => 'TP-2569-0002', 'name' => 'จัดซื้อวัสดุสำนักงาน'],
        ],
    ]);
});

test('tender project select options include projects of every status', function () {
    foreach (['draft', 'published', 'closed', 'completed', 'cancelled', 'archived'] as $status) {
        TenderProjects::factory()->status($status)->create();
    }
    $this->actingAs(internalUserForTenderProjectOptions(), 'web');

    $response = $this->getJson('/api/v1/dashboard/tender-projects/select');

    $response->assertOk()->assertJsonCount(6, 'data');
});
