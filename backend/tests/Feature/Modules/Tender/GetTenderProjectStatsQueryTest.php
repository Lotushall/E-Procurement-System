<?php

use App\Modules\Tender\Application\Project\Queries\GetTenderProjectStatsQuery;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function getTenderProjectStatsQuery(): GetTenderProjectStatsQuery
{
    return app(GetTenderProjectStatsQuery::class);
}

test('execute returns zero stats when there are no projects', function () {
    $stats = getTenderProjectStatsQuery()->execute();

    expect($stats)->toBe([
        'totalCount' => 0,
        'totalBudget' => 0.0,
        'inProgressCount' => 0,
        'completedCount' => 0,
    ]);
});

test('execute counts and sums every project regardless of status', function () {
    TenderProjects::factory()->status('draft')->create(['budget' => 100000]);
    TenderProjects::factory()->status('published')->create(['budget' => 200000]);
    TenderProjects::factory()->status('closed')->create(['budget' => 300000]);
    TenderProjects::factory()->status('completed')->create(['budget' => 400000]);
    TenderProjects::factory()->status('cancelled')->create(['budget' => 500000]);
    TenderProjects::factory()->status('archived')->create(['budget' => 600000]);

    $stats = getTenderProjectStatsQuery()->execute();

    expect($stats['totalCount'])->toBe(6)
        ->and($stats['totalBudget'])->toBe(2100000.0);
});

test('execute counts only published projects as in progress', function () {
    TenderProjects::factory()->status('published')->create();
    TenderProjects::factory()->status('published')->create();
    TenderProjects::factory()->status('draft')->create();
    TenderProjects::factory()->status('completed')->create();

    $stats = getTenderProjectStatsQuery()->execute();

    expect($stats['inProgressCount'])->toBe(2);
});

test('execute counts only completed projects as completed', function () {
    TenderProjects::factory()->status('completed')->create();
    TenderProjects::factory()->status('completed')->create();
    TenderProjects::factory()->status('completed')->create();
    TenderProjects::factory()->status('published')->create();

    $stats = getTenderProjectStatsQuery()->execute();

    expect($stats['completedCount'])->toBe(3);
});
