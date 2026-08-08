<?php

use App\Modules\Vendor\Application\UseCases\PendingVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function pendingVendorProfileUseCase(): PendingVendorProfileUseCase
{
    return app(PendingVendorProfileUseCase::class);
}

test('execute sends an approved vendor profile back to pending and clears verification', function () {
    $profile = VendorProfiles::factory()->approved()->create();

    pendingVendorProfileUseCase()->execute($profile->id);

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'pending',
        'verified_by' => null,
        'verified_at' => null,
        'remark' => null,
    ]);
});

test('execute sends a rejected vendor profile back to pending and clears verification', function () {
    $profile = VendorProfiles::factory()->rejected()->create();

    pendingVendorProfileUseCase()->execute($profile->id);

    $this->assertDatabaseHas('vendor_profiles', [
        'id' => $profile->id,
        'verification_status' => 'pending',
        'verified_by' => null,
        'verified_at' => null,
        'remark' => null,
    ]);
});

test('execute throws when the vendor profile does not exist', function () {
    expect(fn () => pendingVendorProfileUseCase()->execute(999999))
        ->toThrow(ModelNotFoundException::class);
});
