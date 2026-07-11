<?php

namespace App\Modules\Vendor\Domain\Entities;

use App\Modules\Vendor\Domain\States\VerificationStatus;
use App\Modules\Vendor\Domain\States\VerificationStatus\Approved;
use App\Modules\Vendor\Domain\States\VerificationStatus\Pending;
use App\Modules\Vendor\Domain\States\VerificationStatus\Rejected;
use Carbon\CarbonImmutable;

final class VendorProfile
{
    private function __construct(
        private readonly ?int $id,
        private readonly int $userId,
        private VerificationStatus $status,
        private ?CarbonImmutable $verifiedAt,
        private ?int $verifiedBy,
        private ?string $remark,
    ) {}

    public static function create(int $userId): self
    {
        return new self(
            id: null,
            userId: $userId,
            status: new Pending(null),
            verifiedAt: null,
            verifiedBy: null,
            remark: null,
        );
    }

    public static function reconstitute(
        int $id,
        int $userId,
        VerificationStatus $status,
        ?CarbonImmutable $verifiedAt,
        ?int $verifiedBy,
        ?string $remark,
    ): self {
        return new self(
            id: $id,
            userId: $userId,
            status: $status,
            verifiedAt: $verifiedAt,
            verifiedBy: $verifiedBy,
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

    public function resubmit(): void
    {
        if ($this->status instanceof Pending) {
            return;
        }

        $this->status = new Pending($this);
        $this->verifiedAt = null;
        $this->verifiedBy = null;
        $this->remark = null;
    }

    // -----------------------------
    // Getters
    // -----------------------------
    public function id(): ?int
    {
        return $this->id;
    }

    public function userId(): int
    {
        return $this->userId;
    }

    public function status(): VerificationStatus
    {
        return $this->status;
    }

    public function verifiedAt(): ?CarbonImmutable
    {
        return $this->verifiedAt;
    }

    public function verifiedBy(): ?int
    {
        return $this->verifiedBy;
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
