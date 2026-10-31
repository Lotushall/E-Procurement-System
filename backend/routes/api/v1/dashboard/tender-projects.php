<?php

use App\Modules\Tender\Presentation\Http\Controllers\TenderProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {

    Route::prefix('tender-projects')->group(function () {
        Route::get('/select', [TenderProjectController::class, 'select'])
            ->middleware('can:select-options')
            ->name('dashboard.tender-projects.select');

        Route::get('/', [TenderProjectController::class, 'index'])
            ->middleware('can:tender-projects.index')
            ->name('dashboard.tender-projects.index');

        Route::get('/{id}', [TenderProjectController::class, 'show'])
            ->middleware('can:tender-projects.index')
            ->where('id', '[0-9]{1,18}')
            ->name('dashboard.tender-projects.show');

        Route::post('/', [TenderProjectController::class, 'store'])
            ->middleware('can:tender-projects.store')
            ->name('dashboard.tender-projects.store');

        Route::put('/{id}', [TenderProjectController::class, 'update'])
            ->middleware('can:tender-projects.update')
            ->where('id', '[0-9]{1,18}')
            ->name('dashboard.tender-projects.update');

        Route::patch('/{id}/status', [TenderProjectController::class, 'updateStatus'])
            ->middleware('can:tender-projects.updateStatus')
            ->where('id', '[0-9]{1,18}')
            ->name('dashboard.tender-projects.status.update');

        Route::delete('/{id}', [TenderProjectController::class, 'destroy'])
            ->middleware('can:tender-projects.destroy')
            ->where('id', '[0-9]{1,18}')
            ->name('dashboard.tender-projects.destroy');
    });
});
