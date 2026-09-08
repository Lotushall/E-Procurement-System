<?php

use App\Modules\Tender\Presentation\Http\Controllers\TenderProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {

    Route::prefix('tender-projects')->group(function () {
        Route::get('/', [TenderProjectController::class, 'index'])
            ->middleware('can:tender-projects.index')
            ->name('dashboard.tender-projects.index');

        Route::get('/{id}', [TenderProjectController::class, 'show'])
            ->middleware('can:tender-projects.index')
            ->whereNumber('id')
            ->name('dashboard.tender-projects.show');

        Route::post('/', [TenderProjectController::class, 'store'])
            ->middleware('can:tender-projects.store')
            ->name('dashboard.tender-projects.store');

        Route::delete('/{id}', [TenderProjectController::class, 'destroy'])
            ->middleware('can:tender-projects.destroy')
            ->whereNumber('id')
            ->name('dashboard.tender-projects.destroy');
    });
});
