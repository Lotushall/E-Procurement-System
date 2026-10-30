<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Application\Tor\Queries\ListTorsQuery;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function listTorsQuery(): ListTorsQuery
{
    return app(ListTorsQuery::class);
}

/**
 * An internal user holding the given TOR permissions. With $withProfile, the
 * user gets an internal profile in $departmentId (which may be null).
 *
 * @param  list<string>  $permissions
 */
function torQueryViewer(array $permissions, ?int $departmentId = null, bool $withProfile = true): User
{
    $user = User::factory()->create(['user_type' => 'internal']);

    foreach ($permissions as $permission) {
        $user->givePermissionTo(Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']));
    }

    if ($withProfile) {
        InternalProfiles::create([
            'user_id' => $user->id,
            'firstname' => 'A',
            'lastname' => 'B',
            'department_id' => $departmentId,
        ]);
    }

    return $user;
}

/**
 * A TOR outside any project and with no creator unless given, so the
 * factory's random picks never hand it to the viewer by accident.
 *
 * @param  array<string, mixed>  $attributes
 */
function torForQueryTest(array $attributes = []): Tors
{
    return Tors::factory()->create([
        'tender_project_id' => null,
        'created_by' => null,
        ...$attributes,
    ]);
}

test('a viewer with tors.viewAny sees every TOR', function () {
    $hr = Department::create(['name' => 'HR']);
    $it = Department::create(['name' => 'IT']);
    torForQueryTest(['department_id' => $hr->id]);
    torForQueryTest(['department_id' => $it->id]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']));

    expect($result->total())->toBe(2);
});

test('a viewer with tors.viewDepartment sees only TORs of their profile department', function () {
    $hr = Department::create(['name' => 'HR']);
    $it = Department::create(['name' => 'IT']);
    $mine = torForQueryTest(['department_id' => $it->id]);
    torForQueryTest(['department_id' => $hr->id]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewDepartment'], $it->id));

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($mine->id);
});

test('a viewer with tors.viewOwn sees only TORs they created', function () {
    $viewer = torQueryViewer(['tors.viewOwn']);
    $mine = torForQueryTest(['created_by' => $viewer->id]);
    torForQueryTest();

    $result = listTorsQuery()->execute($viewer);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($mine->id);
});

test('a viewer holding tors.viewAny and tors.viewOwn gets the wider tors.viewAny', function () {
    $viewer = torQueryViewer(['tors.viewAny', 'tors.viewOwn']);
    torForQueryTest(['created_by' => $viewer->id]);
    torForQueryTest();

    $result = listTorsQuery()->execute($viewer);

    expect($result->total())->toBe(2);
});

test('a viewer holding tors.viewDepartment and tors.viewOwn does not see their own TOR in another department', function () {
    $hr = Department::create(['name' => 'HR']);
    $it = Department::create(['name' => 'IT']);
    $viewer = torQueryViewer(['tors.viewDepartment', 'tors.viewOwn'], $it->id);
    $inDepartment = torForQueryTest(['department_id' => $it->id]);
    torForQueryTest(['department_id' => $hr->id, 'created_by' => $viewer->id]);

    $result = listTorsQuery()->execute($viewer);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($inDepartment->id);
});

test('a viewer with tors.viewDepartment but no internal profile sees nothing', function () {
    torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewDepartment'], withProfile: false));

    expect($result->total())->toBe(0);
});

test('a viewer with tors.viewDepartment and a profile without a department sees nothing', function () {
    torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewDepartment'], departmentId: null));

    expect($result->total())->toBe(0);
});

test('a viewer without any TOR view permission sees nothing', function () {
    torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer([]));

    expect($result->total())->toBe(0);
});

test('execute searches by title', function () {
    $target = torForQueryTest(['title' => 'จัดซื้อเครื่องพิมพ์เลเซอร์']);
    torForQueryTest(['title' => 'จ้างเหมาทำความสะอาด']);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), search: 'เลเซอร์');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute searches by TOR code', function () {
    $target = torForQueryTest(['tor_code' => 'TOR-2569-0042']);
    torForQueryTest(['tor_code' => 'TOR-2569-0043']);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), search: 'TOR-2569-0042');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by status', function () {
    $target = torForQueryTest(['status' => 'bidding']);
    torForQueryTest(['status' => 'draft']);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), status: 'bidding');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by department', function () {
    $hr = Department::create(['name' => 'HR']);
    $it = Department::create(['name' => 'IT']);
    $target = torForQueryTest(['department_id' => $hr->id]);
    torForQueryTest(['department_id' => $it->id]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), departmentId: $hr->id);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by fiscal year', function () {
    $target = torForQueryTest(['fiscal_year' => 2569]);
    torForQueryTest(['fiscal_year' => 2568]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), fiscalYear: 2569);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by tender project id', function () {
    $project = TenderProjects::factory()->create();
    $target = torForQueryTest(['tender_project_id' => $project->id]);
    torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), tenderProject: (string) $project->id);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters TORs without a tender project when given none', function () {
    $project = TenderProjects::factory()->create();
    torForQueryTest(['tender_project_id' => $project->id]);
    $target = torForQueryTest();

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), tenderProject: 'none');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by procurement method', function () {
    $target = torForQueryTest(['procurement_method' => 'e-bidding']);
    torForQueryTest(['procurement_method' => 'e-market']);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), procurementMethod: 'e-bidding');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute sorts newest first by default', function () {
    $older = torForQueryTest(['created_at' => now()->subDays(2)]);
    $newer = torForQueryTest(['created_at' => now()->subDay()]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']));

    expect(collect($result->items())->pluck('id')->all())->toBe([$newer->id, $older->id]);
});

test('execute sorts by a whitelisted column and direction', function (string $column, mixed $low, mixed $high) {
    $highTor = torForQueryTest([$column => $high]);
    $lowTor = torForQueryTest([$column => $low]);

    $ascending = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), sortBy: $column, sortDirection: 'asc');
    $descending = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), sortBy: $column, sortDirection: 'desc');

    expect(collect($ascending->items())->pluck('id')->all())->toBe([$lowTor->id, $highTor->id])
        ->and(collect($descending->items())->pluck('id')->all())->toBe([$highTor->id, $lowTor->id]);
})->with([
    'tor_code' => ['tor_code', 'TOR-2569-0001', 'TOR-2569-0002'],
    'title' => ['title', 'ก', 'ข'],
    'budget_estimate' => ['budget_estimate', '100000.00', '900000.00'],
    'fiscal_year' => ['fiscal_year', 2568, 2569],
    'bidding_end_at' => ['bidding_end_at', '2026-01-01 00:00:00', '2026-06-01 00:00:00'],
]);

test('execute ignores a sort column outside the whitelist and keeps newest first', function () {
    $older = torForQueryTest(['created_at' => now()->subDays(2)]);
    $newer = torForQueryTest(['created_at' => now()->subDay()]);

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']), sortBy: 'remark');

    expect(collect($result->items())->pluck('id')->all())->toBe([$newer->id, $older->id]);
});

test('execute paginates 20 per page by default', function () {
    foreach (range(1, 21) as $i) {
        torForQueryTest();
    }

    $result = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']));

    expect($result->perPage())->toBe(20)
        ->and($result->total())->toBe(21)
        ->and($result->lastPage())->toBe(2)
        ->and($result->items())->toHaveCount(20);
});

test('execute eager-loads the relations the TOR resource reads', function () {
    torForQueryTest();

    $tor = listTorsQuery()->execute(torQueryViewer(['tors.viewAny']))->items()[0];

    expect($tor->relationLoaded('TorsDepartment'))->toBeTrue()
        ->and($tor->relationLoaded('TorsTenderProject'))->toBeTrue()
        ->and($tor->relationLoaded('TorsCreatedBy'))->toBeTrue()
        ->and($tor->relationLoaded('TorsApprovedBy'))->toBeTrue();
});
