<?php

namespace App\Modules\Auth\Application\UseCases;

use App\Modules\Auth\Application\DTOs\RegisterVendorData;
use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\User\Domain\Contracts\EmailVerificationSenderInterface;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use App\Modules\Vendor\Domain\Entities\VendorCompanyDetail;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Entities\VendorIndividualDetail;
use App\Modules\Vendor\Domain\Entities\VendorProfile;
use App\Modules\Vendor\Domain\Exceptions\VendorIdentityAlreadyRegisteredException;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class RegisterVendorUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly VendorRepositoryInterface $vendors,
        private readonly EmailVerificationSenderInterface $verificationSender,
    ) {}

    /**
     * @throws VendorIdentityAlreadyRegisteredException when the tax ID or citizen ID is already registered
     */
    public function execute(RegisterVendorData $data): User
    {
        $taxId = $data->isCompany() ? TaxId::fromString($data->taxId) : null;
        $citizenId = $data->isCompany() ? null : CitizenId::fromString($data->idCard);

        if ($this->vendors->isIdentityTakenByAnotherVendor($taxId?->value, $citizenId?->value, null)) {
            throw new VendorIdentityAlreadyRegisteredException;
        }

        return DB::transaction(function () use ($data, $taxId, $citizenId): User {
            $user = $this->users->save(User::register(
                username: $data->username,
                email: Email::fromString($data->email),
                passwordHash: Hash::make($data->password),
                userType: UserType::from($data->vendorType),
            ));

            // The notification is queued (config/queue.php: after_commit is
            // false), so this durably enqueues the job as part of this same
            // transaction — if that enqueue fails, the whole registration
            // rolls back with it. Actual delivery happens later, off a
            // worker, and no longer blocks or can fail this transaction.
            $this->verificationSender->sendVerificationEmail($user->id());

            $profile = $this->vendors->saveProfile(VendorProfile::create(userId: $user->id()));

            if ($data->isCompany()) {
                $this->vendors->saveCompanyDetail(VendorCompanyDetail::create(
                    vendorProfileId: $profile->id(),
                    companyName: $data->companyName,
                    businessRegistrationNo: null,
                    taxId: $taxId,
                    branchNo: null,
                    businessType: null,
                    address: null,
                    province: null,
                    postalCode: null,
                ));
            } else {
                [$firstname, $lastname] = $this->splitFullName($data->fullName);

                $this->vendors->saveIndividualDetail(VendorIndividualDetail::create(
                    vendorProfileId: $profile->id(),
                    storeName: $data->storeName,
                    prefix: null,
                    firstname: $firstname,
                    lastname: $lastname,
                    citizenId: $citizenId,
                    businessType: null,
                    taxId: null,
                    address: null,
                    province: null,
                    postalCode: null,
                ));
            }

            $this->vendors->saveContact(VendorContact::create(
                vendorProfileId: $profile->id(),
                contactName: $data->isCompany() ? $data->companyName : $data->storeName,
                contactPosition: null,
                contactPhone: PhoneNumber::fromString($data->phone),
                contactEmail: Email::fromString($data->email),
                lineId: null,
                otherContact: null,
                isMainContact: true,
            ));

            return $user;
        });
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitFullName(string $fullName): array
    {
        $parts = explode(' ', trim($fullName), 2);

        return [$parts[0], $parts[1] ?? ''];
    }
}
