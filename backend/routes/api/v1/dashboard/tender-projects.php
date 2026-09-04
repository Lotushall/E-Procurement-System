<?php

use App\Modules\Tender\Presentation\Http\Controllers\TenderProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {

    Route::prefix('tender-projects')->group(function () {
        Route::get('/', [TenderProjectController::class, 'index'])
            ->middleware('can:tender-projects.index')
            ->name('dashboard.tender-projects.index');

        Route::post('/', [TenderProjectController::class, 'store'])
            ->middleware('can:tender-projects.store')
            ->name('dashboard.tender-projects.store');
    });
});
