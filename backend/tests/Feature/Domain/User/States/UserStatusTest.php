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

test('pending can only transition to active', function () {
    $state = (new Pending(null))->setField('status');

    expect($state->canTransitionTo(Active::class))->toBeTrue()
        ->and($state->canTransitionTo(Suspended::class))->toBeFalse()
        ->and($state->canTransitionTo(Inactive::class))->toBeFalse();
});

test('active can transition to suspended or inactive', function () {
    $state = (new Active(null))->setField('status');

    expect($state->canTransitionTo(Suspended::class))->toBeTrue()
        ->and($state->canTransitionTo(Inactive::class))->toBeTrue()
        ->and($state->canTransitionTo(Pending::class))->toBeFalse();
});

test('suspended can only transition back to active', function () {
    $state = (new Suspended(null))->setField('status');

    expect($state->canTransitionTo(Active::class))->toBeTrue()
        ->and($state->canTransitionTo(Inactive::class))->toBeFalse();
});

test('inactive can only transition back to active', function () {
    $state = (new Inactive(null))->setField('status');

    expect($state->canTransitionTo(Active::class))->toBeTrue()
        ->and($state->canTransitionTo(Suspended::class))->toBeFalse();
});
