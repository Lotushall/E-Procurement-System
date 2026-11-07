<?php

use App\Modules\Tender\Presentation\Http\Controllers\TorController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function () {

    Route::prefix('tors')->group(function () {
        Route::get('/', [TorController::class, 'index'])
            ->middleware('can:tors.index')
            ->name('dashboard.tors.index');

        Route::get('/next-code', [TorController::class, 'nextCode'])
            ->middleware('can:tors.store')
            ->name('dashboard.tors.next-code');

        Route::get('/{id}', [TorController::class, 'show'])
            ->middleware('can:tors.index')
            ->where('id', '[0-9]{1,18}')
            ->name('dashboard.tors.show');

        Route::post('/', [TorController::class, 'store'])
            ->middleware('can:tors.store')
            ->name('dashboard.tors.store');

        Route::put('/{id}', [TorController::class, 'update'])
            ->middleware('can:tors.edit')
            ->where('id', '[0-9]{1,18}')
            ->name('dashboard.tors.update');

        Route::delete('/{id}', [TorController::class, 'destroy'])
            ->middleware('can:tors.destroy')
            ->where('id', '[0-9]{1,18}')
            ->name('dashboard.tors.destroy');
    });
});
