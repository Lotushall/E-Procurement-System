<?php

use App\Modules\User\Presentation\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::get('users', [UserController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.users.index');
});
