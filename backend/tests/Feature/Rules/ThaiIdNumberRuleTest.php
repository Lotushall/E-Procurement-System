<?php

use App\Rules\ThaiIdNumberRule;
use Illuminate\Support\Facades\Validator;

/**
 * @return list<string> the validation errors for the value, empty when it passes
 */
function thaiIdNumberErrors(mixed $value, bool $allowsMasked = false): array
{
    return Validator::make(
        ['taxId' => $value],
        ['taxId' => [new ThaiIdNumberRule('เลขประจำตัวผู้เสียภาษี', $allowsMasked)]],
    )->errors()->get('taxId');
}

test('a number with a correct check digit passes', function () {
    expect(thaiIdNumberErrors('0105536000313'))->toBe([]);
});

test('a number with a wrong check digit fails with a message to check it', function () {
    expect(thaiIdNumberErrors('0105536000314'))->toBe(['เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง']);
});

test('anything but 13 digits fails with a message about the format', function (mixed $value) {
    expect(thaiIdNumberErrors($value))->toBe(['เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก']);
})->with([
    'too short' => ['010553600031'],
    'too long' => ['01055360003133'],
    'letters' => ['01055360003a3'],
    'integer' => [105536000313],
    'array' => [['0105536000313']],
]);

test('the masked form passes only when masked values are allowed', function () {
    expect(thaiIdNumberErrors('xxxxxxxxx0313', allowsMasked: true))->toBe([])
        ->and(thaiIdNumberErrors('XXXXXXXXX0313', allowsMasked: true))->toBe([])
        ->and(thaiIdNumberErrors('xxxxxxxxx0313'))->toBe(['เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก']);
});

test('a value that only looks partly masked fails even when masked values are allowed', function (string $value) {
    expect(thaiIdNumberErrors($value, allowsMasked: true))->not->toBe([]);
})->with([
    'too few mask characters' => ['xxxx0313'],
    'mask mixed into the digits' => ['0105x36000313'],
    'mask with letters after it' => ['xxxxxxxxxabcd'],
    'mask only' => ['xxxxxxxxxxxxx'],
]);
