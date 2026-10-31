<?php

namespace App\Modules\Tender\Domain\States;

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
use Spatie\ModelStates\State;
use Spatie\ModelStates\StateConfig;

/**
 * ความคืบหน้าของ TOR (CONTEXT.md). States are registered in progress order,
 * so TorStatus::all() lists them from draft to completed, then cancelled.
 */
abstract class TorStatus extends State
{
    protected static ?string $name = null;

    public static function config(): StateConfig
    {
        return parent::config()
            ->default(Draft::class)
            ->registerState([
                Draft::class,
                InReview::class,
                RevisionRequired::class,
                Approved::class,
                Published::class,
                Bidding::class,
                Closed::class,
                NoBidder::class,
                Awarded::class,
                Completed::class,
                Cancelled::class,
            ])
            ->allowTransition(Draft::class, InReview::class)
            ->allowTransition(InReview::class, RevisionRequired::class)
            ->allowTransition(InReview::class, Approved::class)
            ->allowTransition(RevisionRequired::class, InReview::class)
            // Any edit after approval sends the TOR back for review.
            ->allowTransition(Approved::class, InReview::class)
            // Published only when a bidding start date is set after the publish time.
            ->allowTransition(Approved::class, Published::class)
            ->allowTransition(Approved::class, Bidding::class)
            ->allowTransition(Published::class, Bidding::class)
            ->allowTransition(Bidding::class, Closed::class)
            ->allowTransition(Bidding::class, NoBidder::class)
            ->allowTransition(Closed::class, Awarded::class)
            ->allowTransition(Awarded::class, Completed::class)
            // A TOR can be cancelled at any step before it has a winner.
            ->allowTransition([
                Draft::class,
                InReview::class,
                RevisionRequired::class,
                Approved::class,
                Published::class,
                Bidding::class,
                Closed::class,
                NoBidder::class,
            ], Cancelled::class);
    }
}
