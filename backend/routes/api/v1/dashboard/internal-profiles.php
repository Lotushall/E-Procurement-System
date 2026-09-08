<?php

use App\Modules\InternalProfiles\Presentation\Http\Controllers\DepartmentController;
use App\Modules\InternalProfiles\Presentation\Http\Controllers\InternalProfilesController;
use App\Modules\InternalProfiles\Presentation\Http\Controllers\PositionController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {

    Route::prefix('internal-profiles')->group(function () {
        Route::get('/select-available', [InternalProfilesController::class, 'selectAvailable'])
            ->middleware('role:admin')
            ->name('dashboard.internal-profiles.select-available');

        Route::get('/select', [InternalProfilesController::class, 'select'])
            ->middleware('role:admin')
            ->name('dashboard.internal-profiles.select');

        Route::get('/', [InternalProfilesController::class, 'index'])
            ->middleware('role:admin')
            ->name('dashboard.internal-profiles.index');

        Route::get('/{id}', [InternalProfilesController::class, 'show'])
            ->middleware('role:admin')
            ->whereNumber('id')
            ->name('dashboard.internal-profiles.show');

        Route::post('/', [InternalProfilesController::class, 'store'])
            ->middleware('role:admin')
            ->name('dashboard.internal-profiles.store');

        Route::patch('/{id}', [InternalProfilesController::class, 'update'])
            ->middleware('role:admin')
            ->whereNumber('id')
            ->name('dashboard.internal-profiles.update');

        Route::delete('/{id}', [InternalProfilesController::class, 'destroy'])
            ->middleware('role:admin')
            ->whereNumber('id')
            ->name('dashboard.internal-profiles.destroy');
    });

    Route::prefix('departments')->group(function () {
        Route::get('/select', [DepartmentController::class, 'select'])
            ->middleware('role:admin')
            ->name('dashboard.departments.select');

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
        Route::get('/select', [PositionController::class, 'select'])
            ->middleware('role:admin')
            ->name('dashboard.positions.select');

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
