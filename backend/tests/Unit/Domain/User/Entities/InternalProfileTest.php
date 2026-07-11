<?php

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Domain\Entities\InternalProfile;

test('create builds a new profile with no id', function () {
    $phone = PhoneNumber::fromString('0812345678');

    $profile = InternalProfile::create(
        userId: 10,
        employeeNo: 'EMP-001',
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        department: 'IT',
        position: 'Developer',
        phone: $phone,
    );

    expect($profile->id())->toBeNull()
        ->and($profile->userId())->toBe(10)
        ->and($profile->employeeNo())->toBe('EMP-001')
        ->and($profile->prefix())->toBe('Mr.')
        ->and($profile->firstname())->toBe('John')
        ->and($profile->lastname())->toBe('Doe')
        ->and($profile->department())->toBe('IT')
        ->and($profile->position())->toBe('Developer')
        ->and($profile->phone())->toBe($phone);
});

test('reconstitute rebuilds a profile from persisted values', function () {
    $phone = PhoneNumber::fromString('0812345678');

    $profile = InternalProfile::reconstitute(
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

    expect($profile->id())->toBe(1)
        ->and($profile->userId())->toBe(10)
        ->and($profile->phone())->toBe($phone);
});

test('update replaces the editable profile fields', function () {
    $profile = InternalProfile::create(
        userId: 10,
        employeeNo: 'EMP-001',
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        department: 'IT',
        position: 'Developer',
        phone: PhoneNumber::fromString('0812345678'),
    );
    $newPhone = PhoneNumber::fromString('0898765432');

    $profile->update(
        employeeNo: 'EMP-002',
        prefix: 'Dr.',
        firstname: 'Jane',
        lastname: 'Smith',
        department: 'HR',
        position: 'Manager',
        phone: $newPhone,
    );

    expect($profile->employeeNo())->toBe('EMP-002')
        ->and($profile->prefix())->toBe('Dr.')
        ->and($profile->firstname())->toBe('Jane')
        ->and($profile->lastname())->toBe('Smith')
        ->and($profile->department())->toBe('HR')
        ->and($profile->position())->toBe('Manager')
        ->and($profile->phone())->toBe($newPhone);
});
