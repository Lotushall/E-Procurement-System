<?php

use App\Modules\User\Application\DTOs\UpdateAccountData;
use App\Modules\User\Application\UseCases\UpdateAccountUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function updateAccountData(array $overrides = []): UpdateAccountData
{
    return UpdateAccountData::from(array_merge([
        'username' => 'newname',
        'email' => 'newemail@example.com',
    ], $overrides));
}

test('execute updates the username and email', function () {
    $target = UserModel::factory()->create([
        'user_type' => 'company',
        'username' => 'oldname',
        'email' => 'old@example.com',
    ]);

    app(UpdateAccountUseCase::class)->execute($target->id, updateAccountData());

    $this->assertDatabaseHas('users', [
        'id' => $target->id,
        'username' => 'newname',
        'email' => 'newemail@example.com',
    ]);
});

test('execute changes the password when one is given', function () {
    $target = UserModel::factory()->create(['user_type' => 'company']);

    app(UpdateAccountUseCase::class)->execute($target->id, updateAccountData(['password' => 'new-secret-1']));

    expect(Hash::check('new-secret-1', $target->fresh()->password))->toBeTrue();
});

test('execute leaves the password unchanged when none is given', function () {
    $target = UserModel::factory()->create(['user_type' => 'company', 'password' => Hash::make('original-pass')]);

    app(UpdateAccountUseCase::class)->execute($target->id, updateAccountData());

    expect(Hash::check('original-pass', $target->fresh()->password))->toBeTrue();
});

test('execute resets email verification when the email changes', function () {
    $target = UserModel::factory()->create(['user_type' => 'company', 'email_verified_at' => now()]);

    app(UpdateAccountUseCase::class)->execute($target->id, updateAccountData());

    expect($target->fresh()->email_verified_at)->toBeNull();
});

test('execute throws when the user does not exist', function () {
    app(UpdateAccountUseCase::class)->execute(999999, updateAccountData());
})->throws(ModelNotFoundException::class);
