<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Application\Project\DTOs\UpdateTenderProjectData;
use App\Modules\Tender\Application\Project\UseCases\UpdateTenderProjectUseCase;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeUpdateTenderProjectData(int $departmentId, int $fiscalYear = 2569): UpdateTenderProjectData
{
    return new UpdateTenderProjectData(
        name: 'จัดซื้อคอมพิวเตอร์ (แก้ไข)',
        description: null,
        budget: '750000',
        departmentId: $departmentId,
        personInChargeId: null,
        procurementMethod: 'วิธีคัดเลือก',
        fiscalYear: $fiscalYear,
        projectStartAt: '2026-10-01',
        projectEndAt: '2027-03-31',
    );
}

test('execute replaces the editable fields and keeps the project code within the same fiscal year', function () {
    $department = Department::create(['name' => 'Finance']);
    $creator = User::factory()->create(['user_type' => 'internal']);
    $model = TenderProjects::factory()->status('closed')->create([
        'project_code' => 'TP-2569-0003',
        'fiscal_year' => 2569,
        'created_by' => $creator->id,
    ]);

    $project = app(UpdateTenderProjectUseCase::class)->execute($model->id, makeUpdateTenderProjectData($department->id));

    expect($project->id())->toBe($model->id)
        ->and($project->projectCode()->value)->toBe('TP-2569-0003')
        ->and($project->name())->toBe('จัดซื้อคอมพิวเตอร์ (แก้ไข)')
        ->and($project->budget()->amount)->toBe('750000.00')
        ->and($project->departmentId())->toBe($department->id)
        ->and($project->procurementMethod())->toBe('วิธีคัดเลือก')
        ->and($project->projectStartAt()->toDateString())->toBe('2026-10-01')
        ->and($project->projectEndAt()->toDateString())->toBe('2027-03-31')
        ->and($project->status())->toBe('closed')
        ->and($project->createdBy())->toBe($creator->id);
});

test('execute issues the next project code of the new fiscal year when the fiscal year changes', function () {
    $department = Department::create(['name' => 'Finance']);
    $model = TenderProjects::factory()->create(['project_code' => 'TP-2569-0003', 'fiscal_year' => 2569]);

    $project = app(UpdateTenderProjectUseCase::class)->execute($model->id, makeUpdateTenderProjectData($department->id, 2570));

    expect($project->projectCode()->value)->toBe('TP-2570-0001')
        ->and($project->fiscalYear())->toBe(2570);
});

test('execute throws when the tender project does not exist', function () {
    $department = Department::create(['name' => 'Finance']);

    app(UpdateTenderProjectUseCase::class)->execute(999999, makeUpdateTenderProjectData($department->id));
})->throws(ModelNotFoundException::class);
