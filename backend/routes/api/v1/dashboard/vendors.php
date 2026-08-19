<?php

use App\Modules\Vendor\Presentation\Http\Controllers\VendorApprovalController;
use Illuminate\Support\Facades\Route;

Route::get('vendors', [VendorApprovalController::class, 'index'])
    ->middleware('can:vendors.viewAny')
    ->name('vendors.index');

Route::get('vendors/{id}', [VendorApprovalController::class, 'show'])
    ->middleware('can:vendors.viewAny')
    ->whereNumber('id')
    ->name('vendors.show');

Route::post('vendors/{id}/approve', [VendorApprovalController::class, 'approve'])
    ->middleware('can:vendors.review')
    ->whereNumber('id')
    ->name('vendors.approve');

Route::post('vendors/{id}/reject', [VendorApprovalController::class, 'reject'])
    ->middleware('can:vendors.review')
    ->whereNumber('id')
    ->name('vendors.reject');

Route::post('vendors/{id}/pending', [VendorApprovalController::class, 'pending'])
    ->middleware('can:vendors.review')
    ->whereNumber('id')
    ->name('vendors.pending');

Route::post('vendors/{vendorId}/documents/{documentId}/approve', [VendorApprovalController::class, 'approveDocument'])
    ->middleware('can:vendors.review')
    ->whereNumber(['vendorId', 'documentId'])
    ->name('vendors.documents.approve');

Route::post('vendors/{vendorId}/documents/{documentId}/reject', [VendorApprovalController::class, 'rejectDocument'])
    ->middleware('can:vendors.review')
    ->whereNumber(['vendorId', 'documentId'])
    ->name('vendors.documents.reject');

Route::post('vendors/{vendorId}/documents/{documentId}/pending', [VendorApprovalController::class, 'pendingDocument'])
    ->middleware('can:vendors.review')
    ->whereNumber(['vendorId', 'documentId'])
    ->name('vendors.documents.pending');
