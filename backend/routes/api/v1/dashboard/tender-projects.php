<?php

use App\Modules\Tender\Presentation\Http\Controllers\TenderProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::get('tender-projects', [TenderProjectController::class, 'index'])
        ->middleware('can:tender-projects.index')
        ->name('dashboard.tender-projects.index');

    Route::post('tender-projects', [TenderProjectController::class, 'store'])
        ->middleware('can:tender-projects.store')
        ->name('dashboard.tender-projects.store');
});
