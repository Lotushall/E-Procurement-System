<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function approveVendorProfileUseCase(): ApproveVendorProfileUseCase
{
    return app(ApproveVendorProfileUseCase::class);
}

test('execute approves a pending vendor profile', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id, 'Looks good');

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
        'remark' => 'Looks good',
    ]);
});

test('execute approves a rejected vendor profile', function () {
    $profile = VendorProfiles::factory()->rejected()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    approveVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'approved',
        'verified_by' => $internalUser->id,
        'remark' => null,
    ]);
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => approveVendorProfileUseCase()->execute(999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});
