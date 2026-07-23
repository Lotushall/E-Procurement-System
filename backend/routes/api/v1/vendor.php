<?php

use App\Modules\Vendor\Presentation\Http\Controllers\VendorController;
use Illuminate\Support\Facades\Route;

Route::prefix('vendor')->group(function () {
    Route::get('profile', [VendorController::class, 'profile'])->name('vendor.profile');

    Route::post('info', [VendorController::class, 'updateVendorInfo'])->name('vendor.info.update');

    Route::post('contact', [VendorController::class, 'updateVendorContact'])->name('vendor.contact.update');

    Route::post('document', [VendorController::class, 'updateVendorDocument'])->name('vendor.document.update');
});
