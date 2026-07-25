<?php

use App\Modules\Vendor\Presentation\Http\Controllers\VendorController;
use Illuminate\Support\Facades\Route;

Route::prefix('vendor')->group(function () {
    Route::get('profile', [VendorController::class, 'profile'])->name('vendor.profile');

    Route::post('info', [VendorController::class, 'updateVendorInfo'])->name('vendor.info.update');

    Route::post('contact', [VendorController::class, 'saveVendorContact'])->name('vendor.contact.save');

    Route::delete('contact/{contact}', [VendorController::class, 'deleteVendorContact'])->name('vendor.contact.delete');

    Route::post('document', [VendorController::class, 'saveVendorDocument'])->name('vendor.document.update');

    Route::delete('document/{document}', [VendorController::class, 'deleteVendorDocument'])->name('vendor.document.delete');

    Route::get('document/{document}/view', [VendorController::class, 'viewVendorDocument'])
        ->middleware('throttle:30,1')
        ->whereNumber('document')
        ->name('vendor.document.view');
});
