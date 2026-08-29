<?php

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\TenderProject;
use App\Modules\Tender\Domain\ValueObjects\ProjectCode;
use Carbon\CarbonImmutable;

function makeTenderProject(): TenderProject
{
    return TenderProject::create(
        projectCode: ProjectCode::fromString('e-GP-2569-0001'),
        name: 'จัดซื้อครุภัณฑ์คอมพิวเตอร์',
        description: 'จัดซื้อคอมพิวเตอร์สำหรับหน่วยงาน',
        budget: Money::fromString('500000'),
        departmentId: 1,
        personInChargeId: 2,
        createdBy: 3,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: CarbonImmutable::parse('2026-09-01'),
        projectEndAt: CarbonImmutable::parse('2026-12-31'),
    );
}

test('create builds a new draft project with no id', function () {
    $project = makeTenderProject();

    expect($project->id())->toBeNull()
        ->and($project->projectCode()->value)->toBe('e-GP-2569-0001')
        ->and($project->name())->toBe('จัดซื้อครุภัณฑ์คอมพิวเตอร์')
        ->and($project->budget()->amount)->toBe('500000.00')
        ->and($project->departmentId())->toBe(1)
        ->and($project->personInChargeId())->toBe(2)
        ->and($project->createdBy())->toBe(3)
        ->and($project->procurementMethod())->toBe('e-bidding')
        ->and($project->fiscalYear())->toBe(2569)
        ->and($project->status())->toBe('draft');
});

test('reconstitute rebuilds a project from persisted values', function () {
    $projectCode = ProjectCode::fromString('e-GP-2569-0001');
    $budget = Money::fromString('500000');

    $project = TenderProject::reconstitute(
        id: 1,
        projectCode: $projectCode,
        name: 'จัดซื้อครุภัณฑ์คอมพิวเตอร์',
        description: null,
        budget: $budget,
        departmentId: 1,
        personInChargeId: null,
        createdBy: 3,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
        status: 'published',
    );

    expect($project->id())->toBe(1)
        ->and($project->projectCode())->toBe($projectCode)
        ->and($project->budget())->toBe($budget)
        ->and($project->status())->toBe('published');
});

test('update replaces the editable project fields', function () {
    $project = makeTenderProject();
    $newCode = ProjectCode::fromString('e-GP-2569-0002');
    $newBudget = Money::fromString('750000');

    $project->update(
        projectCode: $newCode,
        name: 'จัดซื้อครุภัณฑ์คอมพิวเตอร์ (แก้ไข)',
        description: 'รายละเอียดใหม่',
        budget: $newBudget,
        departmentId: 4,
        personInChargeId: 5,
        procurementMethod: 'selective',
        fiscalYear: 2570,
        projectStartAt: null,
        projectEndAt: null,
    );

    expect($project->projectCode())->toBe($newCode)
        ->and($project->name())->toBe('จัดซื้อครุภัณฑ์คอมพิวเตอร์ (แก้ไข)')
        ->and($project->budget())->toBe($newBudget)
        ->and($project->departmentId())->toBe(4)
        ->and($project->personInChargeId())->toBe(5)
        ->and($project->procurementMethod())->toBe('selective')
        ->and($project->fiscalYear())->toBe(2570);
});

test('changeStatus updates the status', function () {
    $project = makeTenderProject();

    $project->changeStatus('published');

    expect($project->status())->toBe('published');
});
