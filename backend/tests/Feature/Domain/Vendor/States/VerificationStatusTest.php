<?php

use App\Modules\Vendor\Domain\States\VerificationStatus;
use App\Modules\Vendor\Domain\States\VerificationStatus\Approved;
use App\Modules\Vendor\Domain\States\VerificationStatus\Pending;
use App\Modules\Vendor\Domain\States\VerificationStatus\Rejected;

test('default state is pending', function () {
    expect(VerificationStatus::config()->defaultStateClass)->toBe(Pending::class);
});

test('morph class values match the existing vendor_profiles.verification_status enum column values', function () {
    expect(Pending::getMorphClass())->toBe('pending')
        ->and(Approved::getMorphClass())->toBe('approved')
        ->and(Rejected::getMorphClass())->toBe('rejected');
});

test('pending can transition to approved or rejected', function () {
    $state = (new Pending(null))->setField('verification_status');

    expect($state->canTransitionTo(Approved::class))->toBeTrue()
        ->and($state->canTransitionTo(Rejected::class))->toBeTrue();
});

test('approved cannot transition anywhere', function () {
    $state = (new Approved(null))->setField('verification_status');

    expect($state->canTransitionTo(Pending::class))->toBeFalse()
        ->and($state->canTransitionTo(Rejected::class))->toBeFalse();
});

test('rejected can only transition back to pending', function () {
    $state = (new Rejected(null))->setField('verification_status');

    expect($state->canTransitionTo(Pending::class))->toBeTrue()
        ->and($state->canTransitionTo(Approved::class))->toBeFalse();
});
