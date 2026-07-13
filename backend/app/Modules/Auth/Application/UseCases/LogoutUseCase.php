<?php

namespace App\Modules\Auth\Application\UseCases;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

final class LogoutUseCase
{
    public function execute(): void
    {
        Auth::guard('web')->logout();
        Session::invalidate();
        Session::regenerateToken();
    }
}
