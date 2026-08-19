<?php

use App\Modules\InternalProfiles\Presentation\Http\Controllers\DepartmentController;
use App\Modules\InternalProfiles\Presentation\Http\Controllers\PositionController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {

    Route::prefix('departments')->group(function () {
        Route::get('/', [DepartmentController::class, 'index'])
            ->middleware('role:admin')
            ->name('dashboard.departments.index');

        Route::post('/', [DepartmentController::class, 'store'])
            ->middleware('role:admin')
            ->name('dashboard.departments.store');

        Route::patch('/{id}', [DepartmentController::class, 'update'])
            ->middleware('role:admin')
            ->whereNumber('id')
            ->name('dashboard.departments.update');

        Route::delete('/{id}', [DepartmentController::class, 'destroy'])
            ->middleware('role:admin')
            ->whereNumber('id')
            ->name('dashboard.departments.destroy');
    });

    Route::prefix('positions')->group(function () {
        Route::get('/', [PositionController::class, 'index'])
            ->middleware('role:admin')
            ->name('dashboard.positions.index');

        Route::post('/', [PositionController::class, 'store'])
            ->middleware('role:admin')
            ->name('dashboard.positions.store');

        Route::patch('/{id}', [PositionController::class, 'update'])
            ->middleware('role:admin')
            ->whereNumber('id')
            ->name('dashboard.positions.update');

        Route::delete('/{id}', [PositionController::class, 'destroy'])
            ->middleware('role:admin')
            ->whereNumber('id')
            ->name('dashboard.positions.destroy');
    });
});
