<?php

use App\Modules\Vendor\Presentation\Http\Controllers\VendorController;
use Illuminate\Support\Facades\Route;

Route::prefix('vendor')->group(function () {
    Route::get('profile', [VendorController::class, 'profile'])->name('vendor.profile');
});
