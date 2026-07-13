<?php

use App\Modules\Auth\Application\UseCases\LogoutUseCase;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

uses(RefreshDatabase::class);

test('logout clears the authenticated session', function () {
    $user = UserModel::factory()->create();
    Auth::guard('web')->login($user);

    expect(Auth::guard('web')->check())->toBeTrue();

    (new LogoutUseCase)->execute();

    expect(Auth::guard('web')->check())->toBeFalse();
});
