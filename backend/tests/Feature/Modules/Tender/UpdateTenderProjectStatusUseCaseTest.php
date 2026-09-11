<?php

use App\Modules\Tender\Application\Project\UseCases\UpdateTenderProjectStatusUseCase;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('execute changes the status and returns no error message', function () {
    $model = TenderProjects::factory()->status('draft')->create(['project_code' => 'TP-2569-0002']);
    $actor = User::factory()->create(['user_type' => 'internal']);

    $message = app(UpdateTenderProjectStatusUseCase::class)->execute($model->id, 'cancelled', $actor->id);

    expect($message)->toBeNull();
    $this->assertDatabaseHas('tenders_projects', [
        'id' => $model->id,
        'project_code' => 'TP-2569-0002',
        'status' => 'cancelled',
    ]);
});

test('execute returns an error message and leaves the project untouched when the status is unchanged', function () {
    $model = TenderProjects::factory()->status('closed')->create();
    $actor = User::factory()->create(['user_type' => 'internal']);

    $message = app(UpdateTenderProjectStatusUseCase::class)->execute($model->id, 'closed', $actor->id);

    expect($message)->toBeString()->not->toBeEmpty();
    $this->assertDatabaseHas('tenders_projects', ['id' => $model->id, 'status' => 'closed']);
});

test('execute throws when the tender project does not exist', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);

    app(UpdateTenderProjectStatusUseCase::class)->execute(999999, 'published', $actor->id);
})->throws(ModelNotFoundException::class);
