<?php

use App\Modules\Notification\Application\UseCases\MarkAllNotificationsAsReadUseCase;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function markAllNotificationsAsReadUseCaseHelper(): MarkAllNotificationsAsReadUseCase
{
    return app(MarkAllNotificationsAsReadUseCase::class);
}

function fakeNotificationForMarkAllNotificationsAsReadUseCase(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }

        public function toArray(object $notifiable): array
        {
            return ['type' => 'test_event', 'message' => 'test notification'];
        }
    };
}

test('execute marks all unread notifications as read for the given user', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotificationForMarkAllNotificationsAsReadUseCase());
    $user->notify(fakeNotificationForMarkAllNotificationsAsReadUseCase());

    markAllNotificationsAsReadUseCaseHelper()->execute($user->id);

    expect($user->unreadNotifications()->count())->toBe(0);
});

test('execute does not mark notifications belonging to other users', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeNotificationForMarkAllNotificationsAsReadUseCase());

    markAllNotificationsAsReadUseCaseHelper()->execute($user->id);

    expect($otherUser->unreadNotifications()->count())->toBe(1);
});
