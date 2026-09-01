<?php

use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;

test('creates a TOR code from a non-blank string', function () {
    $code = TorCode::fromString('TOR-2569-0001');

    expect($code->value)->toBe('TOR-2569-0001')
        ->and((string) $code)->toBe('TOR-2569-0001');
});

test('trims surrounding whitespace', function () {
    $code = TorCode::fromString('  TOR-2569-0001  ');

    expect($code->value)->toBe('TOR-2569-0001');
});

test('rejects a blank TOR code', function () {
    TorCode::fromString('   ');
})->throws(InvalidArgumentException::class);

test('rejects a TOR code longer than 255 characters', function () {
    TorCode::fromString(str_repeat('a', 256));
})->throws(InvalidArgumentException::class);
