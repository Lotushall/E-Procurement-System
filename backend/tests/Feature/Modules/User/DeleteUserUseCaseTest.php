<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\User\Application\UseCases\DeleteUserUseCase;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function insertSessionRowForDeleteUseCase(string $id, int $userId): void
{
    DB::table('sessions')->updateOrInsert(['id' => $id], [
        'user_id' => $userId,
        'ip_address' => '10.0.0.5',
        'user_agent' => 'Mozilla/5.0',
        'payload' => 'x',
        'last_activity' => now()->timestamp,
    ]);
}

test('execute soft-deletes the target user and revokes all of their sessions', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);
    $target = User::factory()->create(['user_type' => 'internal']);
    insertSessionRowForDeleteUseCase('target-session', $target->id);

    $result = app(DeleteUserUseCase::class)->execute($target->id, $actor->id);

    expect($result)->toBeNull();
    $this->assertSoftDeleted('users', ['id' => $target->id]);
    expect(DB::table('sessions')->where('user_id', $target->id)->exists())->toBeFalse();
});

test('execute returns an error message instead of deleting when the target is the acting user', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);

    $result = app(DeleteUserUseCase::class)->execute($actor->id, $actor->id);

    expect($result)->toBe('ไม่สามารถลบบัญชีของตัวเองได้');
    $this->assertDatabaseHas('users', ['id' => $actor->id, 'deleted_at' => null]);
});

test('execute throws when the target user does not exist', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);

    app(DeleteUserUseCase::class)->execute(999999, $actor->id);
})->throws(ModelNotFoundException::class);

test('execute unlinks the internal profile from the deleted user', function () {
    $actor = User::factory()->create(['user_type' => 'internal']);
    $target = User::factory()->create(['user_type' => 'internal']);
    $profile = InternalProfiles::create([
        'user_id' => $target->id,
        'firstname' => 'Jane',
        'lastname' => 'Doe',
    ]);

    app(DeleteUserUseCase::class)->execute($target->id, $actor->id);

    $this->assertDatabaseHas('internal_profiles', ['id' => $profile->id, 'user_id' => null]);
});
