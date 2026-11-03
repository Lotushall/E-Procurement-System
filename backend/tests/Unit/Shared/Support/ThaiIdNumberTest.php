<?php

use App\Shared\Support\ThaiIdNumber;

test('isValid accepts a 13-digit number whose last digit is the check digit', function (string $number) {
    expect(ThaiIdNumber::isValid($number))->toBeTrue();
})->with([
    'citizen ID' => '1101700230708',
    'juristic person tax ID' => '0105536000313',
    'check digit wrapping from 10 to 0' => '0105555123450',
    'check digit wrapping from 11 to 1' => '0000000000001',
]);

test('isValid rejects a 13-digit number with a wrong check digit', function (string $number) {
    expect(ThaiIdNumber::isValid($number))->toBeFalse();
})->with([
    'citizen ID off by one' => '1101700230709',
    'juristic person tax ID off by one' => '0105536000314',
    'all zeros' => '0000000000000',
    'all ones' => '1111111111111',
]);

test('isValid and hasValidFormat reject anything but exactly 13 ASCII digits', function (string $value) {
    expect(ThaiIdNumber::hasValidFormat($value))->toBeFalse()
        ->and(ThaiIdNumber::isValid($value))->toBeFalse();
})->with([
    'empty' => '',
    '12 digits' => '110170023070',
    '14 digits' => '11017002307080',
    'letters' => '110170023070a',
    'dashes' => '1-1017-00230-70-8',
    'spaces' => ' 1101700230708',
    'trailing newline' => "1101700230708\n",
    'Thai digits' => '๑๑๐๑๗๐๐๒๓๐๗๐๘',
    'full-width digits' => '１１０１７００２３０７０８',
    'masked' => 'xxxxxxxxx0708',
]);

test('hasValidFormat accepts 13 digits whatever the check digit', function () {
    expect(ThaiIdNumber::hasValidFormat('1101700230709'))->toBeTrue();
});

test('withCheckDigit appends the check digit to the first twelve digits', function () {
    expect(ThaiIdNumber::withCheckDigit('110170023070'))->toBe('1101700230708')
        ->and(ThaiIdNumber::isValid(ThaiIdNumber::withCheckDigit('987654321098')))->toBeTrue();
});

test('withCheckDigit rejects anything but exactly twelve digits', function (string $value) {
    ThaiIdNumber::withCheckDigit($value);
})->with([
    '11 digits' => '11017002307',
    '13 digits' => '1101700230708',
    'letters' => '11017002307a',
])->throws(InvalidArgumentException::class);
