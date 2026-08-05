<?php

use App\Modules\Vendor\Presentation\Http\Controllers\VendorApprovalController;
use Illuminate\Support\Facades\Route;

Route::get('vendors', [VendorApprovalController::class, 'index'])->name('vendors.index');
Route::get('vendors/{id}', [VendorApprovalController::class, 'show'])->name('vendors.show')->whereNumber('id');
