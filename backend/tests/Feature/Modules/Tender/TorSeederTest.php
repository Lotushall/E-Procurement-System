<?php

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Database\Factories\TorsFactory;
use Database\Seeders\TenderProjectSeeder;
use Database\Seeders\TorSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('TorSeeder creates three TORs for every status with unique TOR codes', function () {
    (new TorSeeder)->run();

    expect(Tors::count())->toBe(30)
        ->and(Tors::pluck('tor_code')->unique())->toHaveCount(30);

    foreach (TorsFactory::STATUSES as $status) {
        expect(Tors::where('status', $status)->count())->toBe(3);
    }
});

test('TorSeeder only approves TORs that have passed internal review', function () {
    User::factory()->create(['user_type' => 'internal']);

    (new TorSeeder)->run();

    $unapproved = Tors::whereIn('status', ['draft', 'in_review', 'revision_required', 'cancelled'])->get();
    $approved = Tors::whereIn('status', ['approved', 'bidding', 'closed', 'no_bidder', 'awarded', 'completed'])->get();

    expect($unapproved->whereNotNull('approved_at'))->toBeEmpty()
        ->and($unapproved->whereNotNull('approved_by'))->toBeEmpty()
        ->and($approved->whereNull('approved_at'))->toBeEmpty()
        ->and($approved->whereNull('approved_by'))->toBeEmpty();
});

test('TorSeeder sets bidding dates that match each TOR status', function () {
    (new TorSeeder)->run();

    foreach (Tors::where('status', 'bidding')->get() as $tor) {
        expect($tor->bidding_start_at->isPast())->toBeTrue()
            ->and($tor->bidding_end_at->isFuture())->toBeTrue();
    }

    foreach (Tors::whereIn('status', ['closed', 'no_bidder', 'awarded', 'completed'])->get() as $tor) {
        expect($tor->bidding_end_at->isPast())->toBeTrue()
            ->and($tor->bidding_start_at->lt($tor->bidding_end_at))->toBeTrue();
    }

    expect(Tors::whereIn('status', ['draft', 'in_review', 'revision_required', 'approved'])->whereNotNull('bidding_start_at')->count())->toBe(0);
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
        ->and(Tors::count())->toBe(30);
});
