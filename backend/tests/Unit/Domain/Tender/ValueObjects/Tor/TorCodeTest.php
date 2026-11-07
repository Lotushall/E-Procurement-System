<?php

use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;

test('creates a TOR code from a non-blank string', function () {
    $code = TorCode::fromString('TOR-2026-0001');

    expect($code->value)->toBe('TOR-2026-0001')
        ->and((string) $code)->toBe('TOR-2026-0001');
});

test('trims surrounding whitespace', function () {
    $code = TorCode::fromString('  TOR-2026-0001  ');

    expect($code->value)->toBe('TOR-2026-0001');
});

test('builds the code of a fiscal year sequence, padded to four digits', function (int $sequence, string $expected) {
    expect((string) TorCode::forSequence(2026, $sequence))->toBe($expected);
})->with([
    'single digit' => [1, 'TOR-2026-0001'],
    'four digits' => [1234, 'TOR-2026-1234'],
    'beyond four digits' => [10000, 'TOR-2026-10000'],
]);

test('rejects a blank TOR code', function () {
    TorCode::fromString('   ');
})->throws(InvalidArgumentException::class);

test('rejects a TOR code longer than 255 characters', function () {
    TorCode::fromString(str_repeat('a', 256));
})->throws(InvalidArgumentException::class);
