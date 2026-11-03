<?php

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a tender project belongs to the user who created it', function () {
    $creator = User::factory()->create(['user_type' => 'internal']);
    $project = TenderProjects::factory()->create(['created_by' => $creator->id]);

    expect($project->TenderProjectsCreatedBy->is($creator))->toBeTrue();
});
