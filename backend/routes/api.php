<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::middleware('auth')->group(function () {
        require __DIR__.'/api/v1/vendor.php';
        require __DIR__.'/api/v1/dashboard/vendors.php';
        require __DIR__.'/api/v1/notification.php';
        require __DIR__.'/api/v1/dashboard/user-management/users.php';
        require __DIR__.'/api/v1/dashboard/internal-profiles.php';
        require __DIR__.'/api/v1/dashboard/tender-projects.php';
    });

    require __DIR__.'/api/v1/auth.php';
});
