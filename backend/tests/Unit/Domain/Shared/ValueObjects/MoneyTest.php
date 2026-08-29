<?php

use App\Modules\Shared\Domain\ValueObjects\Money;

test('creates money from a decimal string', function () {
    $money = Money::fromString('1250.5');

    expect($money->amount)->toBe('1250.50')
        ->and((string) $money)->toBe('1250.50');
});

test('creates money from a whole number string', function () {
    $money = Money::fromString('500');

    expect($money->amount)->toBe('500.00');
});

test('two money values with the same amount are equal', function () {
    $a = Money::fromString('100.00');
    $b = Money::fromString('100');

    expect($a->equals($b))->toBeTrue();
});

test('rejects a negative amount', function () {
    Money::fromString('-100');
})->throws(InvalidArgumentException::class);

test('rejects an amount with more than 2 decimal places', function () {
    Money::fromString('100.123');
})->throws(InvalidArgumentException::class);

test('rejects a non-numeric amount', function () {
    Money::fromString('abc');
})->throws(InvalidArgumentException::class);
