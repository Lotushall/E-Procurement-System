<?php

use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Notifications\QueuedResetPassword;
use App\Modules\User\Infrastructure\Notifications\QueuedVerifyEmail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

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
