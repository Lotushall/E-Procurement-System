<?php

namespace App\Modules\Tender\Domain\Entities\Tor;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\States\TorStatus;
use App\Modules\Tender\Domain\States\TorStatus\Approved;
use App\Modules\Tender\Domain\States\TorStatus\Draft;
use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;
use Carbon\CarbonImmutable;
use Spatie\ModelStates\Exceptions\TransitionNotFound;

final class Tor
{
    private function __construct(
        private readonly ?int $id,
        private TorCode $torCode,
        private string $title,
        private string $scopeOfWork,
        private int $departmentId,
        private ?int $tenderProjectId,
        private Money $budgetEstimate,
        private string $procurementMethod,
        private int $fiscalYear,
        private ?CarbonImmutable $biddingStartAt,
        private ?CarbonImmutable $biddingEndAt,
        private TorStatus $status,
        private readonly ?int $createdBy,
        private ?int $approvedBy,
        private ?CarbonImmutable $approvedAt,
        private ?string $remark,
    ) {}

    public static function create(
        TorCode $torCode,
        string $title,
        string $scopeOfWork,
        int $departmentId,
        ?int $tenderProjectId,
        Money $budgetEstimate,
        string $procurementMethod,
        int $fiscalYear,
        ?CarbonImmutable $biddingStartAt,
        ?CarbonImmutable $biddingEndAt,
        ?int $createdBy,
    ): self {
        return new self(
            id: null,
            torCode: $torCode,
            title: $title,
            scopeOfWork: $scopeOfWork,
            departmentId: $departmentId,
            tenderProjectId: $tenderProjectId,
            budgetEstimate: $budgetEstimate,
            procurementMethod: $procurementMethod,
            fiscalYear: $fiscalYear,
            biddingStartAt: $biddingStartAt,
            biddingEndAt: $biddingEndAt,
            status: new Draft(null),
            createdBy: $createdBy,
            approvedBy: null,
            approvedAt: null,
            remark: null,
        );
    }

    public static function reconstitute(
        int $id,
        TorCode $torCode,
        string $title,
        string $scopeOfWork,
        int $departmentId,
        ?int $tenderProjectId,
        Money $budgetEstimate,
        string $procurementMethod,
        int $fiscalYear,
        ?CarbonImmutable $biddingStartAt,
        ?CarbonImmutable $biddingEndAt,
        TorStatus $status,
        ?int $createdBy,
        ?int $approvedBy,
        ?CarbonImmutable $approvedAt,
        ?string $remark,
    ): self {
        return new self(
            id: $id,
            torCode: $torCode,
            title: $title,
            scopeOfWork: $scopeOfWork,
            departmentId: $departmentId,
            tenderProjectId: $tenderProjectId,
            budgetEstimate: $budgetEstimate,
            procurementMethod: $procurementMethod,
            fiscalYear: $fiscalYear,
            biddingStartAt: $biddingStartAt,
            biddingEndAt: $biddingEndAt,
            status: $status,
            createdBy: $createdBy,
            approvedBy: $approvedBy,
            approvedAt: $approvedAt,
            remark: $remark,
        );
    }

    public function update(
        TorCode $torCode,
        string $title,
        string $scopeOfWork,
        int $departmentId,
        ?int $tenderProjectId,
        Money $budgetEstimate,
        string $procurementMethod,
        int $fiscalYear,
        ?CarbonImmutable $biddingStartAt,
        ?CarbonImmutable $biddingEndAt,
    ): void {
        $this->torCode = $torCode;
        $this->title = $title;
        $this->scopeOfWork = $scopeOfWork;
        $this->departmentId = $departmentId;
        $this->tenderProjectId = $tenderProjectId;
        $this->budgetEstimate = $budgetEstimate;
        $this->procurementMethod = $procurementMethod;
        $this->fiscalYear = $fiscalYear;
        $this->biddingStartAt = $biddingStartAt;
        $this->biddingEndAt = $biddingEndAt;
    }

    public function approve(int $approvedBy, ?string $remark = null): void
    {
        $this->transitionTo(new Approved($this));
        $this->approvedBy = $approvedBy;
        $this->approvedAt = CarbonImmutable::now();
        $this->remark = $remark;
    }

    public function changeStatus(TorStatus $status, ?string $remark = null): void
    {
        $this->transitionTo($status);
        $this->remark = $remark;
    }

    /**
     * Move to the given status, only along a transition TorStatus allows.
     *
     * @throws TransitionNotFound
     */
    private function transitionTo(TorStatus $status): void
    {
        if (! TorStatus::config()->isTransitionAllowed($this->status->getValue(), $status->getValue())) {
            throw TransitionNotFound::make($this->status->getValue(), $status->getValue(), self::class);
        }

        $this->status = $status;
    }

    // -----------------------------
    // Getters
    // -----------------------------
    public function id(): ?int
    {
        return $this->id;
    }

    public function torCode(): TorCode
    {
        return $this->torCode;
    }

    public function title(): string
    {
        return $this->title;
    }

    public function scopeOfWork(): string
    {
        return $this->scopeOfWork;
    }

    public function departmentId(): int
    {
        return $this->departmentId;
    }

    public function tenderProjectId(): ?int
    {
        return $this->tenderProjectId;
    }

    public function budgetEstimate(): Money
    {
        return $this->budgetEstimate;
    }

    public function procurementMethod(): string
    {
        return $this->procurementMethod;
    }

    public function fiscalYear(): int
    {
        return $this->fiscalYear;
    }

    public function biddingStartAt(): ?CarbonImmutable
    {
        return $this->biddingStartAt;
    }

    public function biddingEndAt(): ?CarbonImmutable
    {
        return $this->biddingEndAt;
    }

    public function status(): TorStatus
    {
        return $this->status;
    }

    public function createdBy(): ?int
    {
        return $this->createdBy;
    }

    public function approvedBy(): ?int
    {
        return $this->approvedBy;
    }

    public function approvedAt(): ?CarbonImmutable
    {
        return $this->approvedAt;
    }

    public function remark(): ?string
    {
        return $this->remark;
    }
}
