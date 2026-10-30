<?php

use App\Modules\Tender\Presentation\Http\Controllers\TorController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {

    Route::prefix('tors')->group(function () {
        Route::get('/', [TorController::class, 'index'])
            ->middleware('can:tors.index')
            ->name('dashboard.tors.index');

        Route::get('/{id}', [TorController::class, 'show'])
            ->middleware('can:tors.index')
            ->where('id', '[0-9]{1,18}')
            ->name('dashboard.tors.show');
    });
});
