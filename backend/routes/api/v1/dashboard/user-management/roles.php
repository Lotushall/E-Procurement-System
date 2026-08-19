<?php

use App\Modules\User\Presentation\Http\Controllers\RoleController;

Route::prefix('roles')->group(function () {
    Route::get('/', [RoleController::class, 'index'])
        ->middleware('role:admin')
        ->name('dashboard.roles.index');

    Route::post('/', [RoleController::class, 'store'])
        ->middleware('role:admin')
        ->name('dashboard.roles.store');

    Route::patch('/{id}', [RoleController::class, 'update'])
        ->middleware('role:admin')
        ->whereNumber('id')
        ->name('dashboard.roles.update');

    Route::delete('/{id}', [RoleController::class, 'destroy'])
        ->middleware('role:admin')
        ->whereNumber('id')
        ->name('dashboard.roles.destroy');
});
