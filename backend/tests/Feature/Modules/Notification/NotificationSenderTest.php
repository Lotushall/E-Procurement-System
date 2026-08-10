<?php

use App\Modules\Notification\Domain\Contracts\NotificationSenderInterface;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

uses(RefreshDatabase::class);

function notificationSender(): NotificationSenderInterface
{
    return app(NotificationSenderInterface::class);
}

function fakeDatabaseNotification(): Notification
{
    return new class extends Notification
    {
        public function via(object $notifiable): array
        {
            return ['database'];
        }
    };
}

test('send delivers the notification to a single user', function () {
    NotificationFacade::fake();
    $user = User::factory()->create();
    $notification = fakeDatabaseNotification();

    notificationSender()->send([$user->id], $notification);

    NotificationFacade::assertSentTo($user, $notification::class);
});

test('send delivers the notification to multiple users at once', function () {
    NotificationFacade::fake();
    $users = User::factory()->count(3)->create();
    $notification = fakeDatabaseNotification();

    notificationSender()->send($users->pluck('id')->all(), $notification);

    $users->each(fn (User $user) => NotificationFacade::assertSentTo($user, $notification::class));
});

test('send skips ids that do not exist without throwing', function () {
    NotificationFacade::fake();
    $user = User::factory()->create();
    $notification = fakeDatabaseNotification();

    notificationSender()->send([$user->id, 999999], $notification);

    NotificationFacade::assertSentTo($user, $notification::class);
});
