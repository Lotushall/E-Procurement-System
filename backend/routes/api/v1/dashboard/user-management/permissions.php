<?php

use App\Modules\User\Presentation\Http\Controllers\PermissionController;

Route::prefix('permissions')->group(function () {
    Route::get('/', [PermissionController::class, 'index'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.index');

    Route::post('/', [PermissionController::class, 'store'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.store');

    Route::patch('/{name}', [PermissionController::class, 'update'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.update');

    Route::delete('/{name}', [PermissionController::class, 'destroy'])
        ->middleware('role:admin')
        ->name('dashboard.permissions.destroy');
});
