<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function rejectVendorProfileUseCase(): RejectVendorProfileUseCase
{
    return app(RejectVendorProfileUseCase::class);
}

test('execute rejects a pending vendor profile', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Missing documents');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'verified_by' => $internalUser->id,
        'remark' => 'Missing documents',
    ]);
});

test('execute rejects an approved vendor profile', function () {
    $profile = VendorProfiles::factory()->approved()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    rejectVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Revoked');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'rejected',
        'remark' => 'Revoked',
    ]);
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => rejectVendorProfileUseCase()->execute(999999, $internalUser->id, 'Missing documents'))
        ->toThrow(ModelNotFoundException::class);
});
