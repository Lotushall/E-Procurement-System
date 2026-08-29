<?php

use App\Modules\Tender\Domain\ValueObjects\ProjectCode;

test('creates a project code from a non-blank string', function () {
    $code = ProjectCode::fromString('e-GP-2569-0001');

    expect($code->value)->toBe('e-GP-2569-0001')
        ->and((string) $code)->toBe('e-GP-2569-0001');
});

test('trims surrounding whitespace', function () {
    $code = ProjectCode::fromString('  e-GP-2569-0001  ');

    expect($code->value)->toBe('e-GP-2569-0001');
});

test('rejects a blank project code', function () {
    ProjectCode::fromString('   ');
})->throws(InvalidArgumentException::class);

test('rejects a project code longer than 255 characters', function () {
    ProjectCode::fromString(str_repeat('a', 256));
})->throws(InvalidArgumentException::class);
