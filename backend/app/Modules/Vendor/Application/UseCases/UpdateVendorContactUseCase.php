<?php

namespace App\Modules\Vendor\Application\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Domain\Entities\VendorContact;
use App\Modules\Vendor\Domain\Repositories\VendorRepositoryInterface;
use Illuminate\Support\Facades\DB;

final class UpdateVendorContactUseCase
{
    public function __construct(
        private readonly VendorRepositoryInterface $vendors,
    ) {}

    public function execute(int $vendorProfileId, UpdateVendorContactData $data): void
    {
        DB::transaction(function () use ($vendorProfileId, $data): void {
            $contactPhone = $data->contactPhone !== null ? PhoneNumber::fromString($data->contactPhone) : null;
            $contactEmail = $data->contactEmail !== null ? Email::fromString($data->contactEmail) : null;

            $existing = $this->vendors->findContactsByVendorProfileId($vendorProfileId)[0] ?? null;

            if ($existing === null) {
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

            $this->logChanges($vendorProfileId, $before, [
                'contactName' => $data->contactName,
                'contactPosition' => $data->contactPosition,
                'contactPhone' => $contactPhone?->value,
                'contactEmail' => $contactEmail?->value,
                'lineId' => $data->lineId,
                'otherContact' => $data->otherContact,
                'isMainContact' => $data->isMainContact,
            ]);
        });
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    private function logChanges(int $vendorProfileId, array $before, array $after): void
    {
        $changedFields = [];

        foreach ($after as $field => $value) {
            if (($before[$field] ?? null) !== $value) {
                $changedFields[] = $field;
            }
        }

        if ($changedFields === []) {
            return;
        }

        app_log('Vendor contact updated', [
            'vendor_profile_id' => $vendorProfileId,
            'changed_fields' => $changedFields,
        ], 'info', 'vendor');
    }
}
