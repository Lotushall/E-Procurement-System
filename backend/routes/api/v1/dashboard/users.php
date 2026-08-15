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

    Route::get('permissions', [PermissionController::class, 'index'])
        ->middleware('can:roles.manage')
        ->name('dashboard.permissions.index');

    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('can:users.viewAny')
        ->name('dashboard.roles.index');
});
