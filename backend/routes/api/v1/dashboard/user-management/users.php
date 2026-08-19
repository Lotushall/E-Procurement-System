<?php

use App\Modules\User\Presentation\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {

    Route::prefix('users')->group(function () {

        Route::get('/', [UserController::class, 'index'])
            ->middleware('can:users.viewAny')
            ->name('dashboard.users.index');

        Route::get('/{id}', [UserController::class, 'show'])
            ->middleware('can:users.viewAny')
            ->whereNumber('id')
            ->name('dashboard.users.show');

        Route::patch('/{id}/status', [UserController::class, 'updateStatus'])
            ->middleware('can:users.updateStatus')
            ->whereNumber('id')
            ->name('dashboard.users.status.update');

        Route::delete('/{id}', [UserController::class, 'destroy'])
            ->middleware('can:users.delete')
            ->whereNumber('id')
            ->name('dashboard.users.destroy');

        Route::get('/{id}/sessions', [UserController::class, 'sessions'])
            ->middleware('can:users.update')
            ->whereNumber('id')
            ->name('dashboard.users.sessions.index');

        Route::delete('/{id}/sessions/{sessionId}', [UserController::class, 'revokeSession'])
            ->middleware('can:users.update')
            ->whereNumber('id')
            ->where('sessionId', '[\w-]+')
            ->name('dashboard.users.sessions.revoke');

        Route::delete('/{id}/sessions', [UserController::class, 'revokeAllSessions'])
            ->middleware('can:users.update')
            ->whereNumber('id')
            ->name('dashboard.users.sessions.revokeAll');
    });

    require __DIR__.'/roles.php';
    require __DIR__.'/permissions.php';
});
