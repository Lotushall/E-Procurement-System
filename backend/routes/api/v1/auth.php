<?php

use App\Modules\Auth\Presentation\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'registerVendor'])->name('auth.register');

    Route::post('login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1')
        ->name('auth.login');

    Route::post('logout', [AuthController::class, 'logout'])
        ->middleware('auth:sanctum')
        ->name('auth.logout');

    Route::get('user', [AuthController::class, 'user'])
        ->middleware('auth:sanctum')
        ->name('auth.user');

    Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')
        ->name('verification.verify');

    Route::post('email/resend', [AuthController::class, 'resendVerificationEmail'])
        ->middleware('throttle:3,1')
        ->name('verification.resend');

    Route::post('password/forgot', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:3,1')
        ->name('password.forgot');

    Route::post('password/reset', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:5,1')
        ->name('password.reset');

    Route::post('account', [AuthController::class, 'updateAccount'])
        ->middleware('auth:sanctum')
        ->name('auth.account.update');

    Route::post('password/change', [AuthController::class, 'changePassword'])
        ->middleware('auth:sanctum')
        ->name('auth.password.change');
});
