<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Project\TenderProject;
use App\Modules\Tender\Domain\Repositories\Project\TenderProjectRepositoryInterface;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('nextSequenceForFiscalYear starts at 1 when no project exists for that fiscal year', function () {
    $repository = app(TenderProjectRepositoryInterface::class);

    expect($repository->nextSequenceForFiscalYear(2569))->toBe(1);
});

test('nextSequenceForFiscalYear increments per existing project in that fiscal year', function () {
    $department = Department::create(['name' => 'IT']);
    $repository = app(TenderProjectRepositoryInterface::class);

    $repository->save(TenderProject::create(
        projectCode: ProjectCode::fromString('TP-2569-0001'),
        name: 'จัดซื้อคอมพิวเตอร์',
        description: null,
        budget: Money::fromString('500000'),
        departmentId: $department->id,
        personInChargeId: null,
        createdBy: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    ));

    expect($repository->nextSequenceForFiscalYear(2569))->toBe(2);
});

test('nextSequenceForFiscalYear resets to 1 for a different fiscal year', function () {
    $department = Department::create(['name' => 'IT']);
    $repository = app(TenderProjectRepositoryInterface::class);

    $repository->save(TenderProject::create(
        projectCode: ProjectCode::fromString('TP-2569-0001'),
        name: 'จัดซื้อคอมพิวเตอร์',
        description: null,
        budget: Money::fromString('500000'),
        departmentId: $department->id,
        personInChargeId: null,
        createdBy: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    ));

    expect($repository->nextSequenceForFiscalYear(2570))->toBe(1);
});

test('save persists a new tender project and returns it reconstituted with an id', function () {
    $department = Department::create(['name' => 'IT']);

    $project = TenderProject::create(
        projectCode: ProjectCode::fromString('TP-2569-0001'),
        name: 'จัดซื้อคอมพิวเตอร์',
        description: 'รายละเอียด',
        budget: Money::fromString('500000'),
        departmentId: $department->id,
        personInChargeId: null,
        createdBy: null,
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        projectStartAt: null,
        projectEndAt: null,
    );

    $saved = app(TenderProjectRepositoryInterface::class)->save($project);

    expect($saved->id())->not->toBeNull()
        ->and($saved->projectCode()->value)->toBe('TP-2569-0001')
        ->and($saved->status())->toBe('draft')
        ->and($saved->budget()->amount)->toBe('500000.00');

    $this->assertDatabaseHas('tenders_projects', [
        'id' => $saved->id(),
        'project_code' => 'TP-2569-0001',
        'department_id' => $department->id,
        'status' => 'draft',
    ]);
});

test('findById reconstitutes an existing tender project', function () {
    $model = TenderProjects::factory()->status('published')->create(['project_code' => 'TP-2569-0007']);

    $project = app(TenderProjectRepositoryInterface::class)->findById($model->id);

    expect($project->id())->toBe($model->id)
        ->and($project->projectCode()->value)->toBe('TP-2569-0007')
        ->and($project->status())->toBe('published');
});

test('findById throws when the tender project does not exist', function () {
    app(TenderProjectRepositoryInterface::class)->findById(999999);
})->throws(ModelNotFoundException::class);
