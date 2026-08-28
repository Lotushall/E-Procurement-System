<?php

use App\Modules\InternalProfiles\Infrastructure\Models\InternalProfiles;
use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Application\UseCases\PurgeSoftDeletedUsersUseCase;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User as UserModel;
use App\Modules\User\Infrastructure\Repositories\UserRepository;
use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Infrastructure\Repositories\VendorRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function purgeSoftDeletedUsersUseCase(): PurgeSoftDeletedUsersUseCase
{
    return app(PurgeSoftDeletedUsersUseCase::class);
}

test('execute force-deletes users soft-deleted for more than 30 days', function () {
    $userRepository = new UserRepository;
    $user = $userRepository->save(User::register('old', Email::fromString('old@example.com'), 'hashed-password', UserType::Internal));
    $userRepository->delete($user->id());
    UserModel::withTrashed()->whereKey($user->id())->update(['deleted_at' => now()->subDays(31)]);

    $purged = purgeSoftDeletedUsersUseCase()->execute();

    expect($purged)->toBe(1);
    expect(UserModel::withTrashed()->find($user->id()))->toBeNull();
});

test('execute leaves users soft-deleted less than 30 days ago alone', function () {
    $userRepository = new UserRepository;
    $user = $userRepository->save(User::register('recent', Email::fromString('recent@example.com'), 'hashed-password', UserType::Internal));
    $userRepository->delete($user->id());

    $purged = purgeSoftDeletedUsersUseCase()->execute();

    expect($purged)->toBe(0);
    expect(UserModel::withTrashed()->find($user->id()))->not->toBeNull();
});

test('execute deletes a purged vendor\'s uploaded document files before removing the user', function () {
    Storage::fake('local');
    $userRepository = new UserRepository;
    $vendorRepository = new VendorRepository;

    $vendorUser = $userRepository->save(User::register('vendor', Email::fromString('vendor@example.com'), 'hashed-password', UserType::Company));
    $profile = $vendorRepository->saveProfile(VendorProfile::create(userId: $vendorUser->id()));
    Storage::disk('local')->put('vendor-documents/expired.pdf', 'content');
    $vendorRepository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'citizen_id',
        fileName: 'expired.pdf',
        filePath: 'vendor-documents/expired.pdf',
    ));
    $userRepository->delete($vendorUser->id());
    UserModel::withTrashed()->whereKey($vendorUser->id())->update(['deleted_at' => now()->subDays(31)]);

    purgeSoftDeletedUsersUseCase()->execute();

    Storage::disk('local')->assertMissing('vendor-documents/expired.pdf');
    $this->assertDatabaseMissing('vendor_profiles', ['id' => $profile->id()]);
});

test('execute unlinks (does not delete) a purged user\'s internal profile, since that FK is nullOnDelete not cascadeOnDelete', function () {
    $userRepository = new UserRepository;
    $internalUser = $userRepository->save(User::register('employee', Email::fromString('employee@example.com'), 'hashed-password', UserType::Internal));
    $profile = InternalProfiles::create([
        'user_id' => $internalUser->id(),
        'firstname' => 'Somchai',
        'lastname' => 'Jaidee',
    ]);
    $userRepository->delete($internalUser->id());
    UserModel::withTrashed()->whereKey($internalUser->id())->update(['deleted_at' => now()->subDays(31)]);

    $purged = purgeSoftDeletedUsersUseCase()->execute();

    expect($purged)->toBe(1);
    expect(UserModel::withTrashed()->find($internalUser->id()))->toBeNull();
    $this->assertDatabaseHas('internal_profiles', ['id' => $profile->id, 'user_id' => null]);
});

test('execute continues purging remaining users when one force-delete fails', function () {
    $userRepository = new UserRepository;

    $failingId = $userRepository->save(User::register('failing', Email::fromString('failing@example.com'), 'hashed-password', UserType::Internal))->id();
    $userRepository->delete($failingId);
    UserModel::withTrashed()->whereKey($failingId)->update(['deleted_at' => now()->subDays(31)]);

    $succeeding = $userRepository->save(User::register('succeeding', Email::fromString('succeeding@example.com'), 'hashed-password', UserType::Internal));
    $userRepository->delete($succeeding->id());
    UserModel::withTrashed()->whereKey($succeeding->id())->update(['deleted_at' => now()->subDays(31)]);

    $realVendors = app(VendorRepositoryInterface::class);
    $this->partialMock(VendorRepositoryInterface::class, function ($mock) use ($failingId, $realVendors) {
        $mock->shouldReceive('deleteDocumentFilesForUser')
            ->andReturnUsing(function (int $userId) use ($failingId, $realVendors) {
                if ($userId === $failingId) {
                    throw new RuntimeException('Simulated storage failure.');
                }

                return $realVendors->deleteDocumentFilesForUser($userId);
            });
    });

    $purged = purgeSoftDeletedUsersUseCase()->execute();

    expect($purged)->toBe(1);
    expect(UserModel::withTrashed()->find($failingId))->not->toBeNull();
    expect(UserModel::withTrashed()->find($succeeding->id()))->toBeNull();
});
