<?php

use App\Modules\User\Domain\Enums\UserType;

test('backed values match the users.user_type enum column values', function () {
    expect(UserType::Internal->value)->toBe('internal')
        ->and(UserType::Company->value)->toBe('company')
        ->and(UserType::Individual->value)->toBe('individual');
});

test('can be constructed from a raw column value', function () {
    expect(UserType::from('company'))->toBe(UserType::Company);
});
