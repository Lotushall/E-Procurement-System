<?php

namespace App\Modules\Vendor\Domain\Entities;

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
        private ?string $province,
        private ?PostalCode $postalCode,
    ) {}

    public static function create(
        int $vendorProfileId,
        string $companyName,
        ?string $businessRegistrationNo,
        TaxId $taxId,
        ?string $branchNo,
        ?string $businessType,
        ?string $address,
        ?string $province,
        ?PostalCode $postalCode,
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
            province: $province,
            postalCode: $postalCode,
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
        ?string $province,
        ?PostalCode $postalCode,
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
            province: $province,
            postalCode: $postalCode,
        );
    }

    public function update(
        string $companyName,
        ?string $businessRegistrationNo,
        TaxId $taxId,
        ?string $branchNo,
        ?string $businessType,
        ?string $address,
        ?string $province,
        ?PostalCode $postalCode,
    ): void {
        $this->companyName = $companyName;
        $this->businessRegistrationNo = $businessRegistrationNo;
        $this->taxId = $taxId;
        $this->branchNo = $branchNo;
        $this->businessType = $businessType;
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

    public function province(): ?string
    {
        return $this->province;
    }

    public function postalCode(): ?PostalCode
    {
        return $this->postalCode;
    }
}
