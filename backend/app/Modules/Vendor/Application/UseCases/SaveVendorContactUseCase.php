<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use App\Shared\Support\ChangeLogger;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

final class SaveVendorContactUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
        private readonly ChangeLogger $changeLogger,
    ) {}

    public function execute(int $vendorProfileId, UpdateVendorContactData $data): void
    {
        DB::transaction(function () use ($vendorProfileId, $data): void {
            $contactPhone = $data->contactPhone !== null ? PhoneNumber::fromString($data->contactPhone) : null;
            $contactEmail = $data->contactEmail !== null ? Email::fromString($data->contactEmail) : null;

            if ($data->id === null) {
                $this->vendors->saveContact(VendorContact::create(
                    vendorProfileId: $vendorProfileId,
                    contactName: $data->contactName,
                    contactPosition: $data->contactPosition,
                    contactPhone: $contactPhone,
                    contactEmail: $contactEmail,
                    lineId: $data->lineId,
                    otherContact: $data->otherContact,
                    isMainContact: $data->isMainContact,
                ));

                app_log('Vendor contact created via contact update', [
                    'vendor_profile_id' => $vendorProfileId,
                ], 'info', 'vendor');

                return;
            }

            $existing = $this->findOwnedContact($vendorProfileId, $data->id);

            if ($existing === null) {
                throw new ModelNotFoundException(
                    "Vendor contact {$data->id} not found for vendor profile {$vendorProfileId}."
                );
            }

            $before = [
                'contactName' => $existing->contactName(),
                'contactPosition' => $existing->contactPosition(),
                'contactPhone' => $existing->contactPhone()?->value,
                'contactEmail' => $existing->contactEmail()?->value,
                'lineId' => $existing->lineId(),
                'otherContact' => $existing->otherContact(),
                'isMainContact' => $existing->isMainContact(),
            ];

            $existing->update(
                contactName: $data->contactName,
                contactPosition: $data->contactPosition,
                contactPhone: $contactPhone,
                contactEmail: $contactEmail,
                lineId: $data->lineId,
                otherContact: $data->otherContact,
                isMainContact: $data->isMainContact,
            );

            $this->vendors->saveContact($existing);

            $this->changeLogger->log(
                message: 'Vendor contact updated',
                before: $before,
                after: [
                    'contactName' => $data->contactName,
                    'contactPosition' => $data->contactPosition,
                    'contactPhone' => $contactPhone?->value,
                    'contactEmail' => $contactEmail?->value,
                    'lineId' => $data->lineId,
                    'otherContact' => $data->otherContact,
                    'isMainContact' => $data->isMainContact,
                ],
                context: ['vendor_profile_id' => $vendorProfileId, 'contact_id' => $existing->id()],
                channel: 'vendor',
            );
        });
    }

    private function findOwnedContact(int $vendorProfileId, int $contactId): ?VendorContact
    {
        foreach ($this->vendors->findContactsByVendorProfileId($vendorProfileId) as $contact) {
            if ($contact->id() === $contactId) {
                return $contact;
            }
        }

        return null;
    }
}
