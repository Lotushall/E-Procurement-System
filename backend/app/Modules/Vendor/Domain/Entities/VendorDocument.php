<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Vendor\Domain\States\DocumentStatus;
use App\Modules\Vendor\Domain\States\DocumentStatus\Approved;
use App\Modules\Vendor\Domain\States\DocumentStatus\Pending;
use App\Modules\Vendor\Domain\States\DocumentStatus\Rejected;
use Carbon\CarbonImmutable;

final class VendorDocument
{
    private function __construct(
        private readonly ?int $id,
        private readonly int $vendorProfileId,
        private readonly string $documentType,
        private string $fileName,
        private string $filePath,
        private DocumentStatus $status,
        private ?int $verifiedBy,
        private ?CarbonImmutable $verifiedAt,
        private ?string $remark,
    ) {}

    public static function create(
        int $vendorProfileId,
        string $documentType,
        string $fileName,
        string $filePath,
    ): self {
        return new self(
            id: null,
            vendorProfileId: $vendorProfileId,
            documentType: $documentType,
            fileName: $fileName,
            filePath: $filePath,
            status: new Pending(null),
            verifiedBy: null,
            verifiedAt: null,
            remark: null,
        );
    }

    public static function reconstitute(
        int $id,
        int $vendorProfileId,
        string $documentType,
        string $fileName,
        string $filePath,
        DocumentStatus $status,
        ?int $verifiedBy,
        ?CarbonImmutable $verifiedAt,
        ?string $remark,
    ): self {
        return new self(
            id: $id,
            vendorProfileId: $vendorProfileId,
            documentType: $documentType,
            fileName: $fileName,
            filePath: $filePath,
            status: $status,
            verifiedBy: $verifiedBy,
            verifiedAt: $verifiedAt,
            remark: $remark,
        );
    }

    public function approve(int $verifiedBy, ?string $remark = null): void
    {
        if ($this->status instanceof Approved) {
            return;
        }

        $this->status = new Approved($this);
        $this->verifiedBy = $verifiedBy;
        $this->verifiedAt = CarbonImmutable::now();
        $this->remark = $remark;
    }

    public function reject(int $verifiedBy, ?string $remark = null): void
    {
        if ($this->status instanceof Rejected) {
            return;
        }

        $this->status = new Rejected($this);
        $this->verifiedBy = $verifiedBy;
        $this->verifiedAt = CarbonImmutable::now();
        $this->remark = $remark;
    }

    public function reupload(string $fileName, string $filePath): void
    {
        $this->fileName = $fileName;
        $this->filePath = $filePath;
        $this->status = new Pending($this);
        $this->verifiedBy = null;
        $this->verifiedAt = null;
        $this->remark = null;
    }

    public function resubmit(): void
    {
        if ($this->status instanceof Pending) {
            return;
        }

        $this->status = new Pending($this);
        $this->verifiedBy = null;
        $this->verifiedAt = null;
        $this->remark = null;
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

    public function documentType(): string
    {
        return $this->documentType;
    }

    public function fileName(): string
    {
        return $this->fileName;
    }

    public function filePath(): string
    {
        return $this->filePath;
    }

    public function status(): DocumentStatus
    {
        return $this->status;
    }

    public function verifiedBy(): ?int
    {
        return $this->verifiedBy;
    }

    public function verifiedAt(): ?CarbonImmutable
    {
        return $this->verifiedAt;
    }

    public function remark(): ?string
    {
        return $this->remark;
    }

    public function isPending(): bool
    {
        return $this->status instanceof Pending;
    }

    public function isApproved(): bool
    {
        return $this->status instanceof Approved;
    }

    public function isRejected(): bool
    {
        return $this->status instanceof Rejected;
    }
}
