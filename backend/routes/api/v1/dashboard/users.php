<?php

use App\Modules\User\Presentation\Http\Controllers\PermissionController;
use App\Modules\User\Presentation\Http\Controllers\RoleController;
use App\Modules\User\Presentation\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::get('users', [UserController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.users.index');
    Route::get('users/{id}', [UserController::class, 'show'])
        ->middleware('can:users.viewAny')
        ->whereNumber('id')
        ->name('dashboard.users.show');

    Route::get('users/{id}/sessions', [UserController::class, 'sessions'])
        ->middleware('can:users.update')
        ->whereNumber('id')
        ->name('dashboard.users.sessions.index');
    Route::delete('users/{id}/sessions/{sessionId}', [UserController::class, 'revokeSession'])
        ->middleware('can:users.update')
        ->whereNumber('id')
        ->where('sessionId', '[\w-]+')
        ->name('dashboard.users.sessions.revoke');
    Route::delete('users/{id}/sessions', [UserController::class, 'revokeAllSessions'])
        ->middleware('can:users.update')
        ->whereNumber('id')
        ->name('dashboard.users.sessions.revokeAll');

    Route::get('permissions', [PermissionController::class, 'index'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.index');

    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.roles.index');
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('role:admin')
        ->name('dashboard.roles.store');
});
