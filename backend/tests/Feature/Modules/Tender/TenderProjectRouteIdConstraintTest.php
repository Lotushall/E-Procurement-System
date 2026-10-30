<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function tenderProjectRouteConstraintUser(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    foreach (['viewAny', 'update', 'updateStatus', 'delete'] as $ability) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => "tender_projects.{$ability}", 'guard_name' => 'web']));
    }

    return $user;
}

dataset('tender project id routes', [
    'show' => ['getJson', '/api/v1/dashboard/tender-projects/99999999999999999999'],
    'update' => ['putJson', '/api/v1/dashboard/tender-projects/99999999999999999999'],
    'status update' => ['patchJson', '/api/v1/dashboard/tender-projects/99999999999999999999/status'],
    'destroy' => ['deleteJson', '/api/v1/dashboard/tender-projects/99999999999999999999'],
]);

test('a tender project id too large for an integer returns 404', function (string $method, string $uri) {
    $this->actingAs(tenderProjectRouteConstraintUser(), 'web');

    $this->{$method}($uri)->assertStatus(404);
})->with('tender project id routes');
