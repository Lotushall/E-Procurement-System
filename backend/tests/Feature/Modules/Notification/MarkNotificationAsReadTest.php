<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function fakeNotificationForMarkNotificationAsReadEndpoint(): Notification
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

test('marking a notification as read requires authentication', function () {
    $response = $this->patchJson('/api/v1/notifications/'.Str::uuid().'/read');

    $response->assertStatus(401);
});

test('a user can mark their own notification as read', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotificationForMarkNotificationAsReadEndpoint());
    $notification = $user->notifications()->sole();

    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/notifications/{$notification->id}/read");

    $response->assertNoContent();
    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('a user cannot mark another user notification as read', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeNotificationForMarkNotificationAsReadEndpoint());
    $notification = $otherUser->notifications()->sole();

    $this->actingAs($user, 'web');

    $response = $this->patchJson("/api/v1/notifications/{$notification->id}/read");

    $response->assertStatus(404);
    expect($notification->fresh()->read_at)->toBeNull();
});

test('marking a nonexistent notification as read returns 404', function () {
    $user = User::factory()->create();
    $this->actingAs($user, 'web');

    $response = $this->patchJson('/api/v1/notifications/'.Str::uuid().'/read');

    $response->assertStatus(404);
});
