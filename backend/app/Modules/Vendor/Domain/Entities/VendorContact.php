<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;

final class VendorContact
{
    private function __construct(
        private readonly ?int $id,
        private readonly int $vendorProfileId,
        private ?string $contactName,
        private ?string $contactPosition,
        private ?PhoneNumber $contactPhone,
        private ?Email $contactEmail,
        private ?string $lineId,
        private ?string $otherContact,
        private bool $isMainContact,
    ) {}

    public static function create(
        int $vendorProfileId,
        ?string $contactName,
        ?string $contactPosition,
        ?PhoneNumber $contactPhone,
        ?Email $contactEmail,
        ?string $lineId,
        ?string $otherContact,
        bool $isMainContact = false,
    ): self {
        return new self(
            id: null,
            vendorProfileId: $vendorProfileId,
            contactName: $contactName,
            contactPosition: $contactPosition,
            contactPhone: $contactPhone,
            contactEmail: $contactEmail,
            lineId: $lineId,
            otherContact: $otherContact,
            isMainContact: $isMainContact,
        );
    }

    public static function reconstitute(
        int $id,
        int $vendorProfileId,
        ?string $contactName,
        ?string $contactPosition,
        ?PhoneNumber $contactPhone,
        ?Email $contactEmail,
        ?string $lineId,
        ?string $otherContact,
        bool $isMainContact,
    ): self {
        return new self(
            id: $id,
            vendorProfileId: $vendorProfileId,
            contactName: $contactName,
            contactPosition: $contactPosition,
            contactPhone: $contactPhone,
            contactEmail: $contactEmail,
            lineId: $lineId,
            otherContact: $otherContact,
            isMainContact: $isMainContact,
        );
    }

    public function update(
        ?string $contactName,
        ?string $contactPosition,
        ?PhoneNumber $contactPhone,
        ?Email $contactEmail,
        ?string $lineId,
        ?string $otherContact,
        bool $isMainContact,
    ): void {
        $this->contactName = $contactName;
        $this->contactPosition = $contactPosition;
        $this->contactPhone = $contactPhone;
        $this->contactEmail = $contactEmail;
        $this->lineId = $lineId;
        $this->otherContact = $otherContact;
        $this->isMainContact = $isMainContact;
    }

    // -----------------------------
    // Getters
    // -----------------------------
    public function id(): ?int
    {
        return $this->id;
    }

    public function vendorProfileId(): int
    {
        return $this->vendorProfileId;
    }

    public function contactName(): ?string
    {
        return $this->contactName;
    }

    public function contactPosition(): ?string
    {
        return $this->contactPosition;
    }

    public function contactPhone(): ?PhoneNumber
    {
        return $this->contactPhone;
    }

    public function contactEmail(): ?Email
    {
        return $this->contactEmail;
    }

    public function lineId(): ?string
    {
        return $this->lineId;
    }

    public function otherContact(): ?string
    {
        return $this->otherContact;
    }

    public function isMainContact(): bool
    {
        return $this->isMainContact;
    }

    public function unmarkAsMainContact(): void
    {
        $this->isMainContact = false;
    }
}
