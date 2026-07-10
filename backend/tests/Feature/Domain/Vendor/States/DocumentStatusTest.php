<?php

use App\Modules\Vendor\Domain\States\DocumentStatus;
use App\Modules\Vendor\Domain\States\DocumentStatus\Approved;
use App\Modules\Vendor\Domain\States\DocumentStatus\Pending;
use App\Modules\Vendor\Domain\States\DocumentStatus\Rejected;

test('default state is pending', function () {
    expect(DocumentStatus::config()->defaultStateClass)->toBe(Pending::class);
});

test('morph class values match the existing vendor_documents.status enum column values', function () {
    expect(Pending::getMorphClass())->toBe('pending')
        ->and(Approved::getMorphClass())->toBe('approved')
        ->and(Rejected::getMorphClass())->toBe('rejected');
});

test('pending can transition to approved or rejected', function () {
    $state = (new Pending(null))->setField('status');

    expect($state->canTransitionTo(Approved::class))->toBeTrue()
        ->and($state->canTransitionTo(Rejected::class))->toBeTrue();
});

test('approved cannot transition anywhere', function () {
    $state = (new Approved(null))->setField('status');

    expect($state->canTransitionTo(Pending::class))->toBeFalse()
        ->and($state->canTransitionTo(Rejected::class))->toBeFalse();
});

test('rejected can only transition back to pending', function () {
    $state = (new Rejected(null))->setField('status');

    expect($state->canTransitionTo(Pending::class))->toBeTrue()
        ->and($state->canTransitionTo(Approved::class))->toBeFalse();
});
