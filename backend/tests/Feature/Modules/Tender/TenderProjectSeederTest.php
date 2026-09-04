<?php

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Database\Seeders\TenderProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('TenderProjectSeeder creates the expected number of projects with unique project codes', function () {
    (new TenderProjectSeeder)->run();

    expect(TenderProjects::count())->toBe(30)
        ->and(TenderProjects::pluck('project_code')->unique())->toHaveCount(30);
});

test('TenderProjectSeeder only creates projects with a status from the real DB enum', function () {
    (new TenderProjectSeeder)->run();

    $statuses = TenderProjects::pluck('status')->unique();

    expect($statuses->diff(['draft', 'published', 'closed', 'completed', 'cancelled', 'archived']))->toBeEmpty();
});

test('TenderProjectSeeder attributes seeded projects to the admin user when one exists', function () {
    $admin = User::factory()->create(['email' => 'admin@example.com', 'user_type' => 'internal']);

    (new TenderProjectSeeder)->run();

    expect(TenderProjects::pluck('created_by')->unique()->all())->toBe([$admin->id]);
});

test('TenderProjectSeeder runs without an admin user present', function () {
    (new TenderProjectSeeder)->run();

    expect(TenderProjects::whereNull('created_by')->count())->toBe(30);
});

test('TenderProjectSeeder only assigns an existing internal profile as person in charge', function () {
    $department = Department::firstOrCreate(['name' => 'IT']);
    $profileUser = User::factory()->create(['user_type' => 'internal']);
    $profile = InternalProfiles::create([
        'user_id' => $profileUser->id,
        'firstname' => 'A',
        'lastname' => 'B',
        'department_id' => $department->id,
    ]);

    (new TenderProjectSeeder)->run();

    $assignedIds = TenderProjects::whereNotNull('person_in_charge_id')->pluck('person_in_charge_id')->unique();

    expect($assignedIds->diff([$profile->id]))->toBeEmpty();
});
