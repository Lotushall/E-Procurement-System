<?php

use App\Shared\Support\ChangeLogger;
use Illuminate\Support\Facades\Log;

test('log writes the changed fields with their previous and new values', function () {
    Log::spy()->shouldReceive('channel')->andReturnSelf();

    (new ChangeLogger)->log('Profile updated', ['name' => 'A', 'city' => 'BKK'], ['name' => 'B', 'city' => 'BKK'], ['id' => 1]);

    Log::shouldHaveReceived('log')->once()->with('info', 'Profile updated', [
        'id' => 1,
        'changes' => ['name' => ['from' => 'A', 'to' => 'B']],
    ]);
});

test('log writes nothing when no field changed', function () {
    Log::spy()->shouldReceive('channel')->andReturnSelf();

    (new ChangeLogger)->log('Profile updated', ['name' => 'A'], ['name' => 'A']);

    Log::shouldNotHaveReceived('log');
});

test('log masks sensitive fields, hiding a value of four characters or fewer entirely', function () {
    Log::spy()->shouldReceive('channel')->andReturnSelf();

    (new ChangeLogger)->log(
        'Profile updated',
        ['taxId' => '1234', 'citizenId' => null],
        ['taxId' => '1234567840123', 'citizenId' => '12'],
        sensitiveFields: ['taxId', 'citizenId'],
    );

    Log::shouldHaveReceived('log')->once()->with('info', 'Profile updated', [
        'changes' => [
            'taxId' => ['from' => 'xxxx', 'to' => 'xxxxxxxxx0123'],
            'citizenId' => ['from' => null, 'to' => 'xx'],
        ],
    ]);
});
