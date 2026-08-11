<?php

use App\Modules\Notification\Application\UseCases\MarkNotificationAsReadUseCase;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function markNotificationAsReadUseCaseHelper(): MarkNotificationAsReadUseCase
{
    return app(MarkNotificationAsReadUseCase::class);
}

function fakeNotificationForMarkNotificationAsReadUseCase(): Notification
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

test('execute marks the notification as read', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotificationForMarkNotificationAsReadUseCase());
    $notification = $user->notifications()->sole();

    markNotificationAsReadUseCaseHelper()->execute($user->id, $notification->id);

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('execute throws when the notification belongs to another user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeNotificationForMarkNotificationAsReadUseCase());
    $notification = $otherUser->notifications()->sole();

    expect(fn () => markNotificationAsReadUseCaseHelper()->execute($user->id, $notification->id))
        ->toThrow(ModelNotFoundException::class);
});

test('execute throws when the notification id does not exist', function () {
    $user = User::factory()->create();

    expect(fn () => markNotificationAsReadUseCaseHelper()->execute($user->id, (string) Str::uuid()))
        ->toThrow(ModelNotFoundException::class);
});
