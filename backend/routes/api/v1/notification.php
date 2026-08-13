<?php

use App\Modules\Notification\Presentation\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::patch('{id}/read', [NotificationController::class, 'markAsRead'])->whereUuid('id')->name('notifications.read');
    Route::patch('read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
});
