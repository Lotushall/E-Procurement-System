<?php

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Application\Dashboard\UseCases\DeleteVendorProfileUseCase;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function deleteVendorProfileUseCase(): DeleteVendorProfileUseCase
{
    return app(DeleteVendorProfileUseCase::class);
}

test('execute soft-deletes the linked user account', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    deleteVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    $this->assertSoftDeleted('users', ['id' => $profile->user_id]);
    $this->assertDatabaseHas('vendor_profiles', ['id' => $profile->id]);
});

test('execute revokes the linked user account sessions', function () {
    $profile = VendorProfiles::factory()->create();
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    DB::table('sessions')->insert([
        'id' => 'use-case-session',
        'user_id' => $profile->user_id,
        'ip_address' => '10.0.0.7',
        'user_agent' => 'Mozilla/5.0',
        'payload' => 'x',
        'last_activity' => now()->timestamp,
    ]);

    deleteVendorProfileUseCase()->execute($profile->id, $internalUser->id);

    expect(DB::table('sessions')->where('id', 'use-case-session')->exists())->toBeFalse();
});

test('execute throws when the vendor profile does not exist', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);

    expect(fn () => deleteVendorProfileUseCase()->execute(999999, $internalUser->id))
        ->toThrow(ModelNotFoundException::class);
});
