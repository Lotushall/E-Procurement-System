<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;
use App\Modules\Shared\Domain\ValueObjects\PostalCode;
use App\Modules\Vendor\Domain\ValueObjects\CitizenId;
use App\Modules\Vendor\Domain\ValueObjects\TaxId;

final class VendorIndividualDetail
{
    private function __construct(
        private readonly ?int $id,
        private readonly int $vendorProfileId,
        private string $storeName,
        private ?string $prefix,
        private string $firstname,
        private string $lastname,
        private readonly CitizenId $citizenId,
        private ?string $businessType,
        private ?TaxId $taxId,
        private ?Email $email,
        private PhoneNumber $phone,
        private ?string $address,
        private ?string $country,
        private ?string $province,
        private ?PostalCode $postalCode,
        private ?string $contactName,
        private ?string $lineId,
        private ?string $otherContact,
    ) {}

    public static function create(
        int $vendorProfileId,
        string $storeName,
        ?string $prefix,
        string $firstname,
        string $lastname,
        CitizenId $citizenId,
        ?string $businessType,
        ?TaxId $taxId,
        ?Email $email,
        PhoneNumber $phone,
        ?string $address,
        ?string $country,
        ?string $province,
        ?PostalCode $postalCode,
        ?string $contactName,
        ?string $lineId,
        ?string $otherContact,
    ): self {
        return new self(
            id: null,
            vendorProfileId: $vendorProfileId,
            storeName: $storeName,
            prefix: $prefix,
            firstname: $firstname,
            lastname: $lastname,
            citizenId: $citizenId,
            businessType: $businessType,
            taxId: $taxId,
            email: $email,
            phone: $phone,
            address: $address,
            country: $country,
            province: $province,
            postalCode: $postalCode,
            contactName: $contactName,
            lineId: $lineId,
            otherContact: $otherContact,
        );
    }

    public static function reconstitute(
        int $id,
        int $vendorProfileId,
        string $storeName,
        ?string $prefix,
        string $firstname,
        string $lastname,
        CitizenId $citizenId,
        ?string $businessType,
        ?TaxId $taxId,
        ?Email $email,
        PhoneNumber $phone,
        ?string $address,
        ?string $country,
        ?string $province,
        ?PostalCode $postalCode,
        ?string $contactName,
        ?string $lineId,
        ?string $otherContact,
    ): self {
        return new self(
            id: $id,
            vendorProfileId: $vendorProfileId,
            storeName: $storeName,
            prefix: $prefix,
            firstname: $firstname,
            lastname: $lastname,
            citizenId: $citizenId,
            businessType: $businessType,
            taxId: $taxId,
            email: $email,
            phone: $phone,
            address: $address,
            country: $country,
            province: $province,
            postalCode: $postalCode,
            contactName: $contactName,
            lineId: $lineId,
            otherContact: $otherContact,
        );
    }

    public function update(
        string $storeName,
        ?string $prefix,
        string $firstname,
        string $lastname,
        ?string $businessType,
        ?TaxId $taxId,
        ?Email $email,
        PhoneNumber $phone,
        ?string $address,
        ?string $country,
        ?string $province,
        ?PostalCode $postalCode,
        ?string $contactName,
        ?string $lineId,
        ?string $otherContact,
    ): void {
        $this->storeName = $storeName;
        $this->prefix = $prefix;
        $this->firstname = $firstname;
        $this->lastname = $lastname;
        $this->businessType = $businessType;
        $this->taxId = $taxId;
        $this->email = $email;
        $this->phone = $phone;
        $this->address = $address;
        $this->country = $country;
        $this->province = $province;
        $this->postalCode = $postalCode;
        $this->contactName = $contactName;
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

    public function storeName(): string
    {
        return $this->storeName;
    }

    public function prefix(): ?string
    {
        return $this->prefix;
    }

    public function firstname(): string
    {
        return $this->firstname;
    }

    public function lastname(): string
    {
        return $this->lastname;
    }

    public function citizenId(): CitizenId
    {
        return $this->citizenId;
    }

    public function businessType(): ?string
    {
        return $this->businessType;
    }

    public function taxId(): ?TaxId
    {
        return $this->taxId;
    }

    public function email(): ?Email
    {
        return $this->email;
    }

    public function phone(): PhoneNumber
    {
        return $this->phone;
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

    public function lineId(): ?string
    {
        return $this->lineId;
    }

    public function otherContact(): ?string
    {
        return $this->otherContact;
    }
}
