<?php

use App\Modules\User\Domain\States\UserStatus;
use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Domain\States\UserStatus\Inactive;
use App\Modules\User\Domain\States\UserStatus\Pending;
use App\Modules\User\Domain\States\UserStatus\Suspended;

test('default state is pending', function () {
    expect(UserStatus::config()->defaultStateClass)->toBe(Pending::class);
});

test('morph class values match the existing users.status enum column values', function () {
    expect(Pending::getMorphClass())->toBe('pending')
        ->and(Active::getMorphClass())->toBe('active')
        ->and(Suspended::getMorphClass())->toBe('suspended')
        ->and(Inactive::getMorphClass())->toBe('inactive');
});

test('pending can transition to any other status', function () {
    $state = (new Pending(null))->setField('status');

    expect($state->canTransitionTo(Active::class))->toBeTrue()
        ->and($state->canTransitionTo(Suspended::class))->toBeTrue()
        ->and($state->canTransitionTo(Inactive::class))->toBeTrue();
});

test('active can transition to any other status', function () {
    $state = (new Active(null))->setField('status');

    expect($state->canTransitionTo(Suspended::class))->toBeTrue()
        ->and($state->canTransitionTo(Inactive::class))->toBeTrue()
        ->and($state->canTransitionTo(Pending::class))->toBeTrue();
});

test('suspended can transition to any other status', function () {
    $state = (new Suspended(null))->setField('status');

    expect($state->canTransitionTo(Active::class))->toBeTrue()
        ->and($state->canTransitionTo(Inactive::class))->toBeTrue()
        ->and($state->canTransitionTo(Pending::class))->toBeTrue();
});

test('inactive can transition to any other status', function () {
    $state = (new Inactive(null))->setField('status');

    expect($state->canTransitionTo(Active::class))->toBeTrue()
        ->and($state->canTransitionTo(Suspended::class))->toBeTrue()
        ->and($state->canTransitionTo(Pending::class))->toBeTrue();
});
