<?php

use App\Modules\User\Application\Queries\GetUserByIdQuery;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function getUserByIdQuery(): GetUserByIdQuery
{
    return app(GetUserByIdQuery::class);
}

test('execute returns the user with the given id', function () {
    $user = User::factory()->create(['user_type' => 'internal']);

    $result = getUserByIdQuery()->execute($user->id);

    expect($result->id)->toBe($user->id);
});

test('execute throws when the id does not exist', function () {
    expect(fn () => getUserByIdQuery()->execute(999999))
        ->toThrow(ModelNotFoundException::class);
});
