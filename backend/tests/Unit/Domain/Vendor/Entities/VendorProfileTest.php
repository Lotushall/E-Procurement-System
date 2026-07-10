<?php

use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\States\VerificationStatus\Pending;
use Carbon\CarbonImmutable;

test('holds the given values', function () {
    $status = new Pending(null);
    $verifiedAt = CarbonImmutable::parse('2026-07-10 10:00:00');

    $profile = new VendorProfile(
        id: 1,
        userId: 10,
        status: $status,
        verifiedAt: $verifiedAt,
        verifiedBy: 2,
        remark: 'Looks good',
    );

    expect($profile->id)->toBe(1)
        ->and($profile->userId)->toBe(10)
        ->and($profile->status)->toBe($status)
        ->and($profile->verifiedAt)->toBe($verifiedAt)
        ->and($profile->verifiedBy)->toBe(2)
        ->and($profile->remark)->toBe('Looks good');
});
