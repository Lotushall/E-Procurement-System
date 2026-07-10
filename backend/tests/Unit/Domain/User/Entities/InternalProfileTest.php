<?php

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Domain\Entities\InternalProfile;

test('holds the given values', function () {
    $phone = PhoneNumber::fromString('0812345678');

    $profile = new InternalProfile(
        id: 1,
        userId: 10,
        employeeNo: 'EMP-001',
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        department: 'IT',
        position: 'Developer',
        phone: $phone,
    );

    expect($profile->id)->toBe(1)
        ->and($profile->userId)->toBe(10)
        ->and($profile->employeeNo)->toBe('EMP-001')
        ->and($profile->prefix)->toBe('Mr.')
        ->and($profile->firstname)->toBe('John')
        ->and($profile->lastname)->toBe('Doe')
        ->and($profile->department)->toBe('IT')
        ->and($profile->position)->toBe('Developer')
        ->and($profile->phone)->toBe($phone);
});
