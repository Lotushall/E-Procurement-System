<?php

use App\Modules\Tender\Application\Tor\Queries\GetTorByIdQuery;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function getTorByIdQuery(): GetTorByIdQuery
{
    return app(GetTorByIdQuery::class);
}

function torByIdViewOwnViewer(): User
{
    $user = User::factory()->create(['user_type' => 'internal']);
    $user->givePermissionTo(Permission::firstOrCreate(['name' => 'tors.viewOwn', 'guard_name' => 'web']));

    return $user;
}

test('execute returns a TOR the viewer may see, with its relations loaded', function () {
    $viewer = torByIdViewOwnViewer();
    $tor = Tors::factory()->create(['created_by' => $viewer->id, 'tender_project_id' => null]);

    $found = getTorByIdQuery()->execute($tor->id, $viewer);

    expect($found->id)->toBe($tor->id)
        ->and($found->relationLoaded('TorsDepartment'))->toBeTrue()
        ->and($found->relationLoaded('TorsCreatedBy'))->toBeTrue();
});

test('execute throws for a TOR that does not exist', function () {
    getTorByIdQuery()->execute(999999, torByIdViewOwnViewer());
})->throws(ModelNotFoundException::class);

test('execute throws for an existing TOR outside the viewer visibility', function () {
    $tor = Tors::factory()->create(['created_by' => null, 'tender_project_id' => null]);

    getTorByIdQuery()->execute($tor->id, torByIdViewOwnViewer());
})->throws(ModelNotFoundException::class);
