<?php

use App\Modules\InternalProfiles\Domain\Entities\InternalProfile;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;

test('create builds a new profile with no id', function () {
    $phone = PhoneNumber::fromString('0812345678');

    $profile = InternalProfile::create(
        userId: 10,
        employeeNo: 'EMP-001',
        prefix: 'Mr.',
        firstname: 'John',
        lastname: 'Doe',
        departmentId: 3,
        positionId: 5,
        phone: $phone,
    );

    expect($profile->id())->toBeNull()
        ->and($profile->userId())->toBe(10)
        ->and($profile->employeeNo())->toBe('EMP-001')
        ->and($profile->prefix())->toBe('Mr.')
        ->and($profile->firstname())->toBe('John')
        ->and($profile->lastname())->toBe('Doe')
        ->and($profile->departmentId())->toBe(3)
        ->and($profile->positionId())->toBe(5)
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
        departmentId: 3,
        positionId: 5,
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
        departmentId: 3,
        positionId: 5,
        phone: PhoneNumber::fromString('0812345678'),
    );
    $newPhone = PhoneNumber::fromString('0898765432');

    $profile->update(
        employeeNo: 'EMP-002',
        prefix: 'Dr.',
        firstname: 'Jane',
        lastname: 'Smith',
        departmentId: 7,
        positionId: 9,
        phone: $newPhone,
    );

    expect($profile->employeeNo())->toBe('EMP-002')
        ->and($profile->prefix())->toBe('Dr.')
        ->and($profile->firstname())->toBe('Jane')
        ->and($profile->lastname())->toBe('Smith')
        ->and($profile->departmentId())->toBe(7)
        ->and($profile->positionId())->toBe(9)
        ->and($profile->phone())->toBe($newPhone);
});

test('linkToUser assigns the given user id when unlinked', function () {
    $profile = InternalProfile::create(
        userId: null,
        employeeNo: null,
        prefix: null,
        firstname: 'John',
        lastname: 'Doe',
        departmentId: null,
        positionId: null,
        phone: null,
    );

    $profile->linkToUser(42);

    expect($profile->userId())->toBe(42);
});

test('linkToUser throws when the profile is already linked', function () {
    $profile = InternalProfile::create(
        userId: 10,
        employeeNo: null,
        prefix: null,
        firstname: 'John',
        lastname: 'Doe',
        departmentId: null,
        positionId: null,
        phone: null,
    );

    $profile->linkToUser(99);
})->throws(DomainException::class, 'Internal profile is already linked to a user.');

test('unlinkFromUser clears the user id', function () {
    $profile = InternalProfile::create(
        userId: 10,
        employeeNo: null,
        prefix: null,
        firstname: 'John',
        lastname: 'Doe',
        departmentId: null,
        positionId: null,
        phone: null,
    );

    $profile->unlinkFromUser();

    expect($profile->userId())->toBeNull();
});
