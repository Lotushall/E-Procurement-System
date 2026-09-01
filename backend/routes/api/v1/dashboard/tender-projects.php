<?php

use App\Modules\Tender\Presentation\Http\Controllers\TenderProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {
    Route::post('tender-projects', [TenderProjectController::class, 'store'])
        ->middleware('can:tender-projects.store')
        ->name('dashboard.tender-projects.store');
});
