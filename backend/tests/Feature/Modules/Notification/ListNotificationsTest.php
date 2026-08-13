<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;

uses(RefreshDatabase::class);

function fakeNotificationForListNotificationsEndpoint(): Notification
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

test('listing notifications requires authentication', function () {
    $response = $this->getJson('/api/v1/notifications');

    $response->assertStatus(401);
});

test('a user can list their own notifications', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotificationForListNotificationsEndpoint());

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.type', 'test_event')
        ->assertJsonPath('data.0.message', 'test notification')
        ->assertJsonPath('data.0.readAt', null)
        ->assertJsonStructure([
            'data' => [['id', 'type', 'message', 'readAt', 'createdAt']],
            'meta' => ['currentPage', 'lastPage', 'perPage', 'total'],
        ]);
});

test('a user only sees their own notifications', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherUser->notify(fakeNotificationForListNotificationsEndpoint());

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications');

    $response->assertOk()->assertJsonCount(0, 'data');
});

test('listing notifications filters by unread status', function () {
    $user = User::factory()->create();
    $user->notify(fakeNotificationForListNotificationsEndpoint());
    $user->notify(fakeNotificationForListNotificationsEndpoint());
    $user->notifications()->first()->markAsRead();

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications?status=unread');

    $response->assertOk()->assertJsonCount(1, 'data');
});

test('listing notifications returns camelCase pagination meta', function () {
    $user = User::factory()->create();
    collect(range(1, 3))->each(fn () => $user->notify(fakeNotificationForListNotificationsEndpoint()));

    $this->actingAs($user, 'web');

    $response = $this->getJson('/api/v1/notifications?page=1&per_page=2');

    $response->assertOk()->assertJson([
        'meta' => ['currentPage' => 1, 'lastPage' => 2, 'perPage' => 2, 'total' => 3],
    ]);
});
