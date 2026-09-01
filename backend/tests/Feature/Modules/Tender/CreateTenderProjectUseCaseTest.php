<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData;
use App\Modules\Tender\Application\Project\UseCases\CreateTenderProjectUseCase;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('execute creates a draft tender project with an auto-generated project code', function () {
    $department = Department::create(['name' => 'IT']);
    $creator = User::factory()->create(['user_type' => 'internal']);

    $data = new CreateTenderProjectData(
        name: 'จัดซื้อคอมพิวเตอร์',
        description: 'รายละเอียด',
        budget: '500000',
        departmentId: $department->id,
        personInChargeId: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    );

    $project = app(CreateTenderProjectUseCase::class)->execute($data, $creator->id);

    expect($project->id())->not->toBeNull()
        ->and($project->projectCode()->value)->toBe('TP-2569-0001')
        ->and($project->status())->toBe('draft')
        ->and($project->budget()->amount)->toBe('500000.00')
        ->and($project->createdBy())->toBe($creator->id);
});

test('execute assigns the next sequence number for a second project in the same fiscal year', function () {
    $department = Department::create(['name' => 'IT']);
    $creator = User::factory()->create(['user_type' => 'internal']);
    $makeData = fn () => new CreateTenderProjectData(
        name: 'จัดซื้อคอมพิวเตอร์',
        description: null,
        budget: '100000',
        departmentId: $department->id,
        personInChargeId: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    );

    app(CreateTenderProjectUseCase::class)->execute($makeData(), $creator->id);
    $second = app(CreateTenderProjectUseCase::class)->execute($makeData(), $creator->id);

    expect($second->projectCode()->value)->toBe('TP-2569-0002');
});

test('execute parses nullable start and end dates', function () {
    $department = Department::create(['name' => 'IT']);
    $creator = User::factory()->create(['user_type' => 'internal']);

    $data = new CreateTenderProjectData(
        name: 'จัดซื้อคอมพิวเตอร์',
        description: null,
        budget: '100000',
        departmentId: $department->id,
        personInChargeId: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: '2026-09-01',
        projectEndAt: '2026-12-31',
    );

    $project = app(CreateTenderProjectUseCase::class)->execute($data, $creator->id);

    expect($project->projectStartAt()->toDateString())->toBe('2026-09-01')
        ->and($project->projectEndAt()->toDateString())->toBe('2026-12-31');
});
