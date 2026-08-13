<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function fakeNotificationForUnreadCountEndpoint(): Notification
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

test('unread count requires authentication', function () {
    $response = $this->getJson('/api/v1/notifications/unread-count');

    $response->assertStatus(401);
});

test('unread count only reflects the current user notifications', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $user->notify(fakeNotificationForUnreadCountEndpoint());
    $otherUser->notify(fakeNotificationForUnreadCountEndpoint());
    $otherUser->notify(fakeNotificationForUnreadCountEndpoint());

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications/unread-count');

    $response->assertOk()->assertJson(['data' => ['count' => 1]]);
});
