<?php

namespace App\Modules\Vendor\Domain\Entities;

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
        private CitizenId $citizenId,
        private ?string $businessType,
        private ?TaxId $taxId,
        private ?string $address,
        private ?string $province,
        private ?PostalCode $postalCode,
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
        ?string $address,
        ?string $province,
        ?PostalCode $postalCode,
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
            address: $address,
            province: $province,
            postalCode: $postalCode,
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
        ?string $address,
        ?string $province,
        ?PostalCode $postalCode,
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
            address: $address,
            province: $province,
            postalCode: $postalCode,
        );
    }

    public function update(
        string $storeName,
        ?string $prefix,
        string $firstname,
        string $lastname,
        CitizenId $citizenId,
        ?string $businessType,
        ?TaxId $taxId,
        ?string $address,
        ?string $province,
        ?PostalCode $postalCode,
    ): void {
        $this->storeName = $storeName;
        $this->prefix = $prefix;
        $this->firstname = $firstname;
        $this->lastname = $lastname;
        $this->citizenId = $citizenId;
        $this->businessType = $businessType;
        $this->taxId = $taxId;
        $this->address = $address;
        $this->province = $province;
        $this->postalCode = $postalCode;
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

    public function address(): ?string
    {
        return $this->address;
    }

    public function province(): ?string
    {
        return $this->province;
    }

    public function postalCode(): ?PostalCode
    {
        return $this->postalCode;
    }
}
