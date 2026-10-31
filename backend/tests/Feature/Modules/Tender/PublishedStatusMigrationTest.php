<?php

use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rolling back the published status refuses while any TOR is published', function () {
    $tor = Tors::factory()->status('published')->create();
    $migration = require database_path('migrations/2026_10_31_154815_add_published_status_to_tors_table.php');

    expect(fn () => $migration->down())->toThrow(RuntimeException::class, '1 TOR(s) are published');

    expect($tor->fresh()->status->getValue())->toBe('published');
});
