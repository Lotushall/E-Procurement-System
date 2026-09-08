<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Application\Project\Queries\ListTenderProjectsQuery;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function listTenderProjectsQuery(): ListTenderProjectsQuery
{
    return app(ListTenderProjectsQuery::class);
}

test('execute returns all projects when no filters are given', function () {
    TenderProjects::factory()->create();
    TenderProjects::factory()->create();

    $result = listTenderProjectsQuery()->execute();

    expect($result->total())->toBe(2);
});

test('execute searches by name', function () {
    TenderProjects::factory()->create(['name' => 'จัดซื้อคอมพิวเตอร์โน้ตบุ๊ก']);
    TenderProjects::factory()->create(['name' => 'จัดจ้างทำความสะอาด']);

    $result = listTenderProjectsQuery()->execute(search: 'โน้ตบุ๊ก');

    expect($result->total())->toBe(1);
});

test('execute searches by project code', function () {
    $target = TenderProjects::factory()->create(['project_code' => 'TP-2569-0042']);
    TenderProjects::factory()->create(['project_code' => 'TP-2569-0043']);

    $result = listTenderProjectsQuery()->execute(search: 'TP-2569-0042');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($target->id);
});

test('execute filters by status', function () {
    TenderProjects::factory()->create(['status' => 'draft']);
    TenderProjects::factory()->create(['status' => 'published']);

    $result = listTenderProjectsQuery()->execute(status: 'published');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->status)->toBe('published');
});

test('execute filters by department', function () {
    $it = Department::firstOrCreate(['name' => 'IT']);
    $hr = Department::firstOrCreate(['name' => 'HR']);
    TenderProjects::factory()->create(['department_id' => $it->id]);
    TenderProjects::factory()->create(['department_id' => $hr->id]);

    $result = listTenderProjectsQuery()->execute(departmentId: $hr->id);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->department_id)->toBe($hr->id);
});

test('execute filters by fiscal year', function () {
    TenderProjects::factory()->create(['fiscal_year' => 2569]);
    TenderProjects::factory()->create(['fiscal_year' => 2570]);

    $result = listTenderProjectsQuery()->execute(fiscalYear: 2570);

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->fiscal_year)->toBe(2570);
});

test('execute filters by date range to projects whose period falls entirely within it', function () {
    $inside = TenderProjects::factory()->create([
        'project_start_at' => '2026-09-01',
        'project_end_at' => '2026-09-30',
    ]);
    // Overlaps the range but extends beyond it on both ends — must be excluded,
    // since the filter matches on containment, not overlap.
    TenderProjects::factory()->create([
        'project_start_at' => '2026-08-15',
        'project_end_at' => '2026-10-15',
    ]);
    TenderProjects::factory()->create([
        'project_start_at' => '2026-01-01',
        'project_end_at' => '2026-03-01',
    ]);

    $result = listTenderProjectsQuery()->execute(dateFrom: '2026-09-01', dateTo: '2026-09-30');

    expect($result->total())->toBe(1)
        ->and($result->items()[0]->id)->toBe($inside->id);
});

test('execute sorts by the given column and direction', function () {
    TenderProjects::factory()->create(['name' => 'Bravo Project']);
    TenderProjects::factory()->create(['name' => 'Alpha Project']);

    $result = listTenderProjectsQuery()->execute(sortBy: 'name', sortDirection: 'asc');

    expect(collect($result->items())->pluck('name')->toArray())->toBe(['Alpha Project', 'Bravo Project']);
});

test('execute defaults to sorting by created_at descending', function () {
    $older = TenderProjects::factory()->create();
    $older->forceFill(['created_at' => now()->subDay()])->save();
    $newer = TenderProjects::factory()->create();

    $result = listTenderProjectsQuery()->execute();

    expect($result->items()[0]->id)->toBe($newer->id);
});

test('execute paginates results', function () {
    for ($i = 0; $i < 25; $i++) {
        TenderProjects::factory()->create();
    }

    $result = listTenderProjectsQuery()->execute(page: 2, perPage: 10);

    expect($result->count())->toBe(10)
        ->and($result->currentPage())->toBe(2)
        ->and($result->total())->toBe(25);
});

test('execute trims surrounding whitespace from the search term', function () {
    TenderProjects::factory()->create(['name' => 'จัดซื้อคอมพิวเตอร์โน้ตบุ๊ก']);

    $result = listTenderProjectsQuery()->execute(search: '  โน้ตบุ๊ก  ');

    expect($result->total())->toBe(1);
});

test('execute tie-breaks equal sort values in the requested direction', function () {
    $older = TenderProjects::factory()->create(['budget' => 500000]);
    $newer = TenderProjects::factory()->create(['budget' => 500000]);

    $ascending = listTenderProjectsQuery()->execute(sortBy: 'budget', sortDirection: 'asc');
    expect(collect($ascending->items())->pluck('id')->toArray())->toBe([$older->id, $newer->id]);

    $descending = listTenderProjectsQuery()->execute(sortBy: 'budget', sortDirection: 'desc');
    expect(collect($descending->items())->pluck('id')->toArray())->toBe([$newer->id, $older->id]);
});
