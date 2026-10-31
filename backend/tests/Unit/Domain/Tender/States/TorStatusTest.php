<?php

use App\Modules\Tender\Domain\States\TorStatus;
use App\Modules\Tender\Domain\States\TorStatus\Approved;
use App\Modules\Tender\Domain\States\TorStatus\Awarded;
use App\Modules\Tender\Domain\States\TorStatus\Bidding;
use App\Modules\Tender\Domain\States\TorStatus\Cancelled;
use App\Modules\Tender\Domain\States\TorStatus\Closed;
use App\Modules\Tender\Domain\States\TorStatus\Completed;
use App\Modules\Tender\Domain\States\TorStatus\Draft;
use App\Modules\Tender\Domain\States\TorStatus\InReview;
use App\Modules\Tender\Domain\States\TorStatus\NoBidder;
use App\Modules\Tender\Domain\States\TorStatus\Published;
use App\Modules\Tender\Domain\States\TorStatus\RevisionRequired;

test('TorStatus lists every status name in progress order', function () {
    expect(TorStatus::all()->keys()->all())->toBe([
        'draft',
        'in_review',
        'revision_required',
        'approved',
        'published',
        'bidding',
        'closed',
        'no_bidder',
        'awarded',
        'completed',
        'cancelled',
    ]);
});

test('TorStatus allows each step of the TOR progress', function (string $from, string $to) {
    expect(TorStatus::config()->isTransitionAllowed($from, $to))->toBeTrue();
})->with([
    'submit for review' => [Draft::class, InReview::class],
    'send back for revision' => [InReview::class, RevisionRequired::class],
    'resubmit after revision' => [RevisionRequired::class, InReview::class],
    'approve' => [InReview::class, Approved::class],
    'edit after approval' => [Approved::class, InReview::class],
    'publish ahead of the bidding start' => [Approved::class, Published::class],
    'publish straight into bidding' => [Approved::class, Bidding::class],
    'bidding start arrives' => [Published::class, Bidding::class],
    'deadline passes with bids' => [Bidding::class, Closed::class],
    'deadline passes without bids' => [Bidding::class, NoBidder::class],
    'pick a winner' => [Closed::class, Awarded::class],
    'finish' => [Awarded::class, Completed::class],
]);

test('TorStatus lets a TOR be cancelled at any step before it has a winner', function (string $from) {
    expect(TorStatus::config()->isTransitionAllowed($from, Cancelled::class))->toBeTrue();
})->with([
    Draft::class,
    InReview::class,
    RevisionRequired::class,
    Approved::class,
    Published::class,
    Bidding::class,
    Closed::class,
    NoBidder::class,
]);

test('TorStatus rejects steps outside the TOR progress', function (string $from, string $to) {
    expect(TorStatus::config()->isTransitionAllowed($from, $to))->toBeFalse();
})->with([
    'publish without approval' => [Draft::class, Published::class],
    'approve without review' => [Draft::class, Approved::class],
    'cancel after a winner' => [Awarded::class, Cancelled::class],
    'cancel after completion' => [Completed::class, Cancelled::class],
    'reopen a cancelled TOR' => [Cancelled::class, Draft::class],
    'award without closing' => [Bidding::class, Awarded::class],
]);
