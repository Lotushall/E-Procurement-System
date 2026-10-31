<?php

use App\Modules\Tender\Domain\States\TorStatus\Bidding;
use App\Modules\Tender\Domain\States\TorStatus\Published;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('the command opens bidding on published TORs whose start time has arrived', function () {
    $due = Tors::factory()->status('published')->create(['bidding_start_at' => now()->subMinute(), 'bidding_end_at' => now()->addDays(10)]);
    $notYet = Tors::factory()->status('published')->create(['bidding_start_at' => now()->addDay(), 'bidding_end_at' => now()->addDays(10)]);
    $approved = Tors::factory()->status('approved')->create(['bidding_start_at' => now()->subMinute(), 'bidding_end_at' => now()->addDays(10)]);

    $this->artisan('app:open-due-bidding-windows')
        ->expectsOutputToContain('Opened bidding on 1 TOR(s).')
        ->assertExitCode(0);

    expect($due->fresh()->status)->toBeInstanceOf(Bidding::class)
        ->and($notYet->fresh()->status)->toBeInstanceOf(Published::class)
        ->and($approved->fresh()->status->getValue())->toBe('approved');
});

test('the command is scheduled every minute', function () {
    $event = collect(app(Schedule::class)->events())
        ->first(fn (Event $event) => str_contains($event->command ?? '', 'app:open-due-bidding-windows'));

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('* * * * *');
});
