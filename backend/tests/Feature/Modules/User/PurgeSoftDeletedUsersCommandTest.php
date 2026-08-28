<?php

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the command purges eligible users and reports the count', function () {
    $repository = new UserRepository;
    $user = $repository->save(User::register('old', Email::fromString('old@example.com'), 'hashed-password', UserType::Internal));
    $repository->delete($user->id());
    UserModel::withTrashed()->whereKey($user->id())->update(['deleted_at' => now()->subDays(31)]);

    $this->artisan('app:purge-soft-deleted-users')
        ->expectsOutputToContain('Purged 1 user(s).')
        ->assertExitCode(0);

    expect(UserModel::withTrashed()->find($user->id()))->toBeNull();
});
