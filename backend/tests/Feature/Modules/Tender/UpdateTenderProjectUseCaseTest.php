<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Application\Project\DTOs\UpdateTenderProjectData;
use App\Modules\Tender\Application\Project\UseCases\UpdateTenderProjectUseCase;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeUpdateTenderProjectData(int $departmentId, int $fiscalYear = 2026): UpdateTenderProjectData
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
        'project_code' => 'TP-2026-0003',
        'fiscal_year' => 2026,
        'created_by' => $creator->id,
    ]);

    $project = app(UpdateTenderProjectUseCase::class)->execute($model->id, makeUpdateTenderProjectData($department->id), false);

    expect($project->id())->toBe($model->id)
        ->and($project->projectCode()->value)->toBe('TP-2026-0003')
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
    $model = TenderProjects::factory()->status('draft')->create(['project_code' => 'TP-2026-0003', 'fiscal_year' => 2026]);

    $project = app(UpdateTenderProjectUseCase::class)->execute($model->id, makeUpdateTenderProjectData($department->id, 2027), false);

    expect($project->projectCode()->value)->toBe('TP-2027-0001')
        ->and($project->fiscalYear())->toBe(2027);
});

test('execute throws when the tender project does not exist', function () {
    $department = Department::create(['name' => 'Finance']);

    app(UpdateTenderProjectUseCase::class)->execute(999999, makeUpdateTenderProjectData($department->id), false);
})->throws(ModelNotFoundException::class);

test('execute rejects editing a finished project while the status lock applies', function (string $status) {
    $department = Department::create(['name' => 'Finance']);
    $model = TenderProjects::factory()->status($status)->create(['name' => 'ชื่อเดิม']);

    $result = app(UpdateTenderProjectUseCase::class)->execute($model->id, makeUpdateTenderProjectData($department->id), false);

    expect($result)->toBeString()->not->toBeEmpty();
    $this->assertDatabaseHas('tenders_projects', ['id' => $model->id, 'name' => 'ชื่อเดิม']);
})->with(['completed', 'cancelled', 'archived']);

test('execute edits a finished project once the status lock is lifted', function () {
    $department = Department::create(['name' => 'Finance']);
    $model = TenderProjects::factory()->status('completed')->create();

    $result = app(UpdateTenderProjectUseCase::class)->execute($model->id, makeUpdateTenderProjectData($department->id), true);

    expect($result)->toBeInstanceOf(TenderProject::class)
        ->and($result->name())->toBe('จัดซื้อคอมพิวเตอร์ (แก้ไข)');
});
