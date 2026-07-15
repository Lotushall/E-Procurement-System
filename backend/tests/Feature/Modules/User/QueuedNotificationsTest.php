<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Notifications\QueuedResetPassword;
use App\Modules\User\Infrastructure\Notifications\QueuedVerifyEmail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

/**
 * Renders through the real Mailer::send() pipeline (via a harmless "array"
 * transport) rather than ->render(), since the notification's actual
 * delivery mailer resolution only happens on the real send path.
 */
function renderNotificationHtml(UserModel $user, $notification): string
{
    config(['mail.default' => 'array']);
    $transport = app('mail.manager')->mailer('array')->getSymfonyTransport();

    Notification::sendNow($user, $notification);

    $messages = iterator_to_array($transport->messages());

    return end($messages)->getOriginalMessage()->getHtmlBody();
}

test('QueuedVerifyEmail implements ShouldQueue', function () {
    expect(new QueuedVerifyEmail)->toBeInstanceOf(ShouldQueue::class);
});

test('QueuedResetPassword implements ShouldQueue', function () {
    expect(new QueuedResetPassword('a-token'))->toBeInstanceOf(ShouldQueue::class);
});

test('sending the email verification notification pushes a job onto the queue instead of sending inline', function () {
    Queue::fake();

    $user = UserModel::factory()->unverified()->create();

    $user->sendEmailVerificationNotification();

    Queue::assertPushed(SendQueuedNotifications::class, function (SendQueuedNotifications $job) {
        return $job->notification instanceof QueuedVerifyEmail;
    });
});

test('sending the password reset notification pushes a job onto the queue instead of sending inline', function () {
    Queue::fake();

    $user = UserModel::factory()->create();

    $user->sendPasswordResetNotification('a-token');

    Queue::assertPushed(SendQueuedNotifications::class, function (SendQueuedNotifications $job) {
        return $job->notification instanceof QueuedResetPassword;
    });
});

test('the email header logo is served from the public storage disk', function () {
    $user = UserModel::factory()->create();

    $html = renderNotificationHtml($user, new QueuedVerifyEmail);

    expect($html)->toContain('src="'.Storage::disk('public')->url('images/lotushall_logo.png').'"');
});

test('the email header logo links to the frontend app, not the backend API', function () {
    $user = UserModel::factory()->create();

    $html = renderNotificationHtml($user, new QueuedVerifyEmail);

    expect($html)->toContain('href="'.config('app.frontend_url').'"')
        ->and($html)->not->toContain('href="'.config('app.url').'"');
});
