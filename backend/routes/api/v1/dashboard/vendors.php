<?php

use App\Modules\Vendor\Presentation\Http\Controllers\VendorApprovalController;
use Illuminate\Support\Facades\Route;

Route::get('vendors', [VendorApprovalController::class, 'index'])->name('vendors.index');
Route::get('vendors/{id}', [VendorApprovalController::class, 'show'])->name('vendors.show')->whereNumber('id');

Route::post('vendors/{id}/approve', [VendorApprovalController::class, 'approve'])->whereNumber('id')->name('vendors.approve');
Route::post('vendors/{id}/reject', [VendorApprovalController::class, 'reject'])->whereNumber('id')->name('vendors.reject');
Route::post('vendors/{id}/pending', [VendorApprovalController::class, 'pending'])->whereNumber('id')->name('vendors.pending');
