<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\TorDocuments;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('tender project, TOR, and TOR document relations resolve after the module reorg', function () {
    $department = Department::create(['name' => 'IT']);

    $project = TenderProjects::create([
        'project_code' => 'TP-2569-0001',
        'name' => 'จัดซื้อคอมพิวเตอร์',
        'budget' => '500000.00',
        'department_id' => $department->id,
        'procurement_method' => 'e-bidding',
        'fiscal_year' => 2569,
    ]);

    $tor = Tors::create([
        'tor_code' => 'TOR-2569-0001',
        'title' => 'จัดซื้อคอมพิวเตอร์ 50 เครื่อง',
        'scope_of_work' => 'ขอบเขตงาน',
        'department_id' => $department->id,
        'tender_project_id' => $project->id,
        'budget_estimate' => '500000.00',
    ]);

    $document = TorDocuments::create([
        'label' => 'ขอบเขตงานฉบับเต็ม',
        'tor_id' => $tor->id,
        'file_name' => 'scope.pdf',
        'file_path' => 'tor-documents/scope.pdf',
    ]);

    expect($project->TenderProjectsTors)->toHaveCount(1)
        ->and($project->TenderProjectsTors->first()->id)->toBe($tor->id)
        ->and($tor->TorsTenderProject->id)->toBe($project->id)
        ->and($tor->TorsDocuments)->toHaveCount(1)
        ->and($document->TorDocumentsTor->id)->toBe($tor->id);
});
