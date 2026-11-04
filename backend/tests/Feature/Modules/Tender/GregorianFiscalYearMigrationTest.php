<?php

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function gregorianFiscalYearMigration(): object
{
    return require database_path('migrations/2026_11_04_120000_convert_fiscal_years_to_gregorian.php');
}

test('the migration moves project fiscal years and codes from Buddhist to Gregorian years', function () {
    $project = TenderProjects::factory()->create(['fiscal_year' => 2570, 'project_code' => 'TP-2570-0003']);

    gregorianFiscalYearMigration()->up();

    expect($project->fresh())
        ->fiscal_year->toBe(2027)
        ->project_code->toBe('TP-2027-0003');
});

test('the migration moves TOR fiscal years and codes from Buddhist to Gregorian years', function () {
    $tor = Tors::factory()->create(['fiscal_year' => 2569, 'tor_code' => 'TOR-2569-0012', 'tender_project_id' => null]);

    gregorianFiscalYearMigration()->up();

    expect($tor->fresh())
        ->fiscal_year->toBe(2026)
        ->tor_code->toBe('TOR-2026-0012');
});

test('the migration moves the TOR code counter to the Gregorian year', function () {
    DB::table('tor_code_sequences')->insert(['fiscal_year' => 2570, 'last_sequence' => 7, 'created_at' => now(), 'updated_at' => now()]);

    gregorianFiscalYearMigration()->up();

    expect(DB::table('tor_code_sequences')->pluck('last_sequence', 'fiscal_year')->all())->toBe([2027 => 7]);
});

test('the migration keeps the higher counter when the Gregorian year already has one', function () {
    DB::table('tor_code_sequences')->insert([
        ['fiscal_year' => 2570, 'last_sequence' => 7, 'created_at' => now(), 'updated_at' => now()],
        ['fiscal_year' => 2027, 'last_sequence' => 9, 'created_at' => now(), 'updated_at' => now()],
    ]);

    gregorianFiscalYearMigration()->up();

    expect(DB::table('tor_code_sequences')->pluck('last_sequence', 'fiscal_year')->all())->toBe([2027 => 9]);
});

test('the migration leaves rows that are already in Gregorian years alone', function () {
    $project = TenderProjects::factory()->create(['fiscal_year' => 2027, 'project_code' => 'TP-2027-0001']);

    gregorianFiscalYearMigration()->up();

    expect($project->fresh())
        ->fiscal_year->toBe(2027)
        ->project_code->toBe('TP-2027-0001');
});

test('the migration keeps a code whose year does not match the fiscal year as it is', function () {
    $project = TenderProjects::factory()->create(['fiscal_year' => 2570, 'project_code' => 'LEGACY-001']);

    gregorianFiscalYearMigration()->up();

    expect($project->fresh())
        ->fiscal_year->toBe(2027)
        ->project_code->toBe('LEGACY-001');
});

test('rolling the migration back restores the Buddhist years and codes', function () {
    $project = TenderProjects::factory()->create(['fiscal_year' => 2570, 'project_code' => 'TP-2570-0003']);
    $tor = Tors::factory()->create(['fiscal_year' => 2570, 'tor_code' => 'TOR-2570-0001', 'tender_project_id' => null]);
    DB::table('tor_code_sequences')->insert(['fiscal_year' => 2570, 'last_sequence' => 1, 'created_at' => now(), 'updated_at' => now()]);
    $migration = gregorianFiscalYearMigration();

    $migration->up();
    $migration->down();

    expect($project->fresh())->fiscal_year->toBe(2570)->project_code->toBe('TP-2570-0003')
        ->and($tor->fresh())->fiscal_year->toBe(2570)->tor_code->toBe('TOR-2570-0001')
        ->and(DB::table('tor_code_sequences')->pluck('last_sequence', 'fiscal_year')->all())->toBe([2570 => 1]);
});
