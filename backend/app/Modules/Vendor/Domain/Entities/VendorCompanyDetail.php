<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

final class VendorCompanyDetail
{
    private function __construct(
        private readonly ?int $id,
        private readonly int $vendorProfileId,
        private string $companyName,
        private ?string $businessRegistrationNo,
        private TaxId $taxId,
        private ?string $branchNo,
        private ?string $businessType,
        private ?string $address,
        private ?string $country,
        private ?string $province,
        private ?PostalCode $postalCode,
        private ?string $contactName,
        private ?string $contactPosition,
        private PhoneNumber $contactPhone,
        private Email $contactEmail,
        private ?string $lineId,
        private ?string $otherContact,
    ) {}

    public static function create(
        int $vendorProfileId,
        string $companyName,
        ?string $businessRegistrationNo,
        TaxId $taxId,
        ?string $branchNo,
        ?string $businessType,
        ?string $address,
        ?string $country,
        ?string $province,
        ?PostalCode $postalCode,
        ?string $contactName,
        ?string $contactPosition,
        PhoneNumber $contactPhone,
        Email $contactEmail,
        ?string $lineId,
        ?string $otherContact,
    ): self {
        return new self(
            id: null,
            vendorProfileId: $vendorProfileId,
            companyName: $companyName,
            businessRegistrationNo: $businessRegistrationNo,
            taxId: $taxId,
            branchNo: $branchNo,
            businessType: $businessType,
            address: $address,
            country: $country,
            province: $province,
            postalCode: $postalCode,
            contactName: $contactName,
            contactPosition: $contactPosition,
            contactPhone: $contactPhone,
            contactEmail: $contactEmail,
            lineId: $lineId,
            otherContact: $otherContact,
        );
    }

    public static function reconstitute(
        int $id,
        int $vendorProfileId,
        string $companyName,
        ?string $businessRegistrationNo,
        TaxId $taxId,
        ?string $branchNo,
        ?string $businessType,
        ?string $address,
        ?string $country,
        ?string $province,
        ?PostalCode $postalCode,
        ?string $contactName,
        ?string $contactPosition,
        PhoneNumber $contactPhone,
        Email $contactEmail,
        ?string $lineId,
        ?string $otherContact,
    ): self {
        return new self(
            id: $id,
            vendorProfileId: $vendorProfileId,
            companyName: $companyName,
            businessRegistrationNo: $businessRegistrationNo,
            taxId: $taxId,
            branchNo: $branchNo,
            businessType: $businessType,
            address: $address,
            country: $country,
            province: $province,
            postalCode: $postalCode,
            contactName: $contactName,
            contactPosition: $contactPosition,
            contactPhone: $contactPhone,
            contactEmail: $contactEmail,
            lineId: $lineId,
            otherContact: $otherContact,
        );
    }

    public function update(
        string $companyName,
        ?string $businessRegistrationNo,
        TaxId $taxId,
        ?string $branchNo,
        ?string $businessType,
        ?string $address,
        ?string $country,
        ?string $province,
        ?PostalCode $postalCode,
        ?string $contactName,
        ?string $contactPosition,
        PhoneNumber $contactPhone,
        Email $contactEmail,
        ?string $lineId,
        ?string $otherContact,
    ): void {
        $this->companyName = $companyName;
        $this->businessRegistrationNo = $businessRegistrationNo;
        $this->taxId = $taxId;
        $this->branchNo = $branchNo;
        $this->businessType = $businessType;
        $this->address = $address;
        $this->country = $country;
        $this->province = $province;
        $this->postalCode = $postalCode;
        $this->contactName = $contactName;
        $this->contactPosition = $contactPosition;
        $this->contactPhone = $contactPhone;
        $this->contactEmail = $contactEmail;
        $this->lineId = $lineId;
        $this->otherContact = $otherContact;
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

    public function companyName(): string
    {
        return $this->companyName;
    }

    public function businessRegistrationNo(): ?string
    {
        return $this->businessRegistrationNo;
    }

    public function taxId(): TaxId
    {
        return $this->taxId;
    }

    public function branchNo(): ?string
    {
        return $this->branchNo;
    }

    public function businessType(): ?string
    {
        return $this->businessType;
    }

    public function address(): ?string
    {
        return $this->address;
    }

    public function country(): ?string
    {
        return $this->country;
    }

    public function province(): ?string
    {
        return $this->province;
    }

    public function postalCode(): ?PostalCode
    {
        return $this->postalCode;
    }

    public function contactName(): ?string
    {
        return $this->contactName;
    }

    public function contactPosition(): ?string
    {
        return $this->contactPosition;
    }

    public function contactPhone(): PhoneNumber
    {
        return $this->contactPhone;
    }

    public function contactEmail(): Email
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
}
