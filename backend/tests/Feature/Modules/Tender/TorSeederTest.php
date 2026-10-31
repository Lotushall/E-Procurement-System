<?php

use App\Modules\Tender\Domain\States\TorStatus;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Database\Seeders\TenderProjectSeeder;
use Database\Seeders\TorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('TorSeeder creates three TORs for every status with unique TOR codes', function () {
    (new TorSeeder)->run();

    expect(Tors::count())->toBe(33)
        ->and(Tors::pluck('tor_code')->unique())->toHaveCount(33);

    foreach (TorStatus::all()->keys() as $status) {
        expect(Tors::where('status', $status)->count())->toBe(3);
    }
});

test('TorSeeder only approves TORs that have passed internal review', function () {
    User::factory()->create(['user_type' => 'internal']);

    (new TorSeeder)->run();

    $unapproved = Tors::whereIn('status', ['draft', 'in_review', 'revision_required', 'cancelled'])->get();
    $approved = Tors::whereIn('status', ['approved', 'published', 'bidding', 'closed', 'no_bidder', 'awarded', 'completed'])->get();

    expect($unapproved->whereNotNull('approved_at'))->toBeEmpty()
        ->and($unapproved->whereNotNull('approved_by'))->toBeEmpty()
        ->and($approved->whereNull('approved_at'))->toBeEmpty()
        ->and($approved->whereNull('approved_by'))->toBeEmpty();
});

test('TorSeeder sets bidding dates that match each TOR status', function () {
    (new TorSeeder)->run();

    foreach (Tors::where('status', 'published')->get() as $tor) {
        expect($tor->bidding_start_at->isFuture())->toBeTrue()
            ->and($tor->bidding_start_at->lt($tor->bidding_end_at))->toBeTrue();
    }

    foreach (Tors::where('status', 'bidding')->get() as $tor) {
        expect($tor->bidding_start_at->isPast())->toBeTrue()
            ->and($tor->bidding_end_at->isFuture())->toBeTrue();
    }

    foreach (Tors::whereIn('status', ['closed', 'no_bidder', 'awarded', 'completed'])->get() as $tor) {
        expect($tor->bidding_end_at->isPast())->toBeTrue()
            ->and($tor->bidding_start_at->lt($tor->bidding_end_at))->toBeTrue();
    }

    foreach (Tors::whereIn('status', ['draft', 'in_review', 'revision_required', 'approved'])->get() as $tor) {
        expect($tor->bidding_end_at?->isFuture() ?? true)->toBeTrue();

        if ($tor->bidding_start_at !== null) {
            expect($tor->bidding_start_at->isFuture())->toBeTrue()
                ->and($tor->bidding_start_at->lt($tor->bidding_end_at))->toBeTrue();
        }
    }

    expect(Tors::where('status', 'approved')->whereNull('bidding_end_at')->count())->toBe(0)
        ->and(Tors::where('status', 'cancelled')->whereNotNull('bidding_start_at')->count())->toBe(0);
});

test('TorsFactory gives some pre-publish TORs a bidding start date and leaves others to start at publish', function () {
    $tors = Tors::factory()->count(30)->status('approved')->create();

    expect($tors->whereNotNull('bidding_start_at'))->not->toBeEmpty()
        ->and($tors->whereNull('bidding_start_at'))->not->toBeEmpty();
});

test('TorSeeder gives TORs inside a project the project department', function () {
    (new TenderProjectSeeder)->run();
    (new TorSeeder)->run();

    $linked = Tors::whereNotNull('tender_project_id')->get();

    expect($linked)->not->toBeEmpty();

    foreach ($linked as $tor) {
        expect($tor->department_id)->toBe(TenderProjects::find($tor->tender_project_id)->department_id);
    }
});

test('TorSeeder runs without any tender project', function () {
    (new TorSeeder)->run();

    expect(Tors::whereNotNull('tender_project_id')->count())->toBe(0)
        ->and(Tors::count())->toBe(33);
});
