<?php

use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\States\VerificationStatus\Approved;
use App\Modules\Vendor\Domain\States\VerificationStatus\Pending;
use App\Modules\Vendor\Domain\States\VerificationStatus\Rejected;
use Carbon\CarbonImmutable;

test('create builds a new pending profile with no id', function () {
    $profile = VendorProfile::create(userId: 10);

    expect($profile->id())->toBeNull()
        ->and($profile->userId())->toBe(10)
        ->and($profile->status())->toBeInstanceOf(Pending::class)
        ->and($profile->isPending())->toBeTrue()
        ->and($profile->verifiedAt())->toBeNull()
        ->and($profile->verifiedBy())->toBeNull()
        ->and($profile->remark())->toBeNull();
});

test('reconstitute rebuilds a profile from persisted values', function () {
    $status = new Approved(null);
    $verifiedAt = CarbonImmutable::parse('2026-07-10 10:00:00');

    $profile = VendorProfile::reconstitute(
        id: 1,
        userId: 10,
        status: $status,
        verifiedAt: $verifiedAt,
        verifiedBy: 2,
        remark: 'Looks good',
    );

    expect($profile->id())->toBe(1)
        ->and($profile->userId())->toBe(10)
        ->and($profile->status())->toBe($status)
        ->and($profile->verifiedAt())->toBe($verifiedAt)
        ->and($profile->verifiedBy())->toBe(2)
        ->and($profile->remark())->toBe('Looks good');
});

test('approve transitions a pending profile to approved', function () {
    $profile = VendorProfile::create(userId: 10);

    $profile->approve(verifiedBy: 2, remark: 'Looks good');

    expect($profile->status())->toBeInstanceOf(Approved::class)
        ->and($profile->isApproved())->toBeTrue()
        ->and($profile->verifiedBy())->toBe(2)
        ->and($profile->remark())->toBe('Looks good')
        ->and($profile->verifiedAt())->not->toBeNull();
});

test('approve is a no-op when already approved', function () {
    $profile = VendorProfile::create(userId: 10);
    $profile->approve(verifiedBy: 2);
    $approvedState = $profile->status();

    $profile->approve(verifiedBy: 3, remark: 'again');

    expect($profile->status())->toBe($approvedState)
        ->and($profile->verifiedBy())->toBe(2);
});

test('reject transitions a pending profile to rejected', function () {
    $profile = VendorProfile::create(userId: 10);

    $profile->reject(verifiedBy: 2, remark: 'Missing documents');

    expect($profile->status())->toBeInstanceOf(Rejected::class)
        ->and($profile->isRejected())->toBeTrue()
        ->and($profile->remark())->toBe('Missing documents');
});

test('resubmit transitions a rejected profile back to pending and clears verification', function () {
    $profile = VendorProfile::create(userId: 10);
    $profile->reject(verifiedBy: 2, remark: 'Missing documents');

    $profile->resubmit();

    expect($profile->status())->toBeInstanceOf(Pending::class)
        ->and($profile->isPending())->toBeTrue()
        ->and($profile->verifiedAt())->toBeNull()
        ->and($profile->verifiedBy())->toBeNull()
        ->and($profile->remark())->toBeNull();
});
