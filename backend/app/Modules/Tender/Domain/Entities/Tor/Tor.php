<?php

namespace App\Modules\Tender\Domain\Entities\Tor;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\States\TorStatus;
use App\Modules\Tender\Domain\States\TorStatus\Approved;
use App\Modules\Tender\Domain\States\TorStatus\Bidding;
use App\Modules\Tender\Domain\States\TorStatus\Draft;
use App\Modules\Tender\Domain\States\TorStatus\InReview;
use App\Modules\Tender\Domain\States\TorStatus\Published;
use App\Modules\Tender\Domain\States\TorStatus\RevisionRequired;
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

    /**
     * Replace the editable fields. Changing anything on an approved TOR sends
     * it back for review (CONTEXT.md); saving the same values does not.
     *
     * @return bool whether any field changed
     */
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
    ): bool {
        $changed = (string) $this->torCode !== (string) $torCode
            || $this->title !== $title
            || $this->scopeOfWork !== $scopeOfWork
            || $this->departmentId !== $departmentId
            || $this->tenderProjectId !== $tenderProjectId
            || $this->budgetEstimate->amount !== $budgetEstimate->amount
            || $this->procurementMethod !== $procurementMethod
            || $this->fiscalYear !== $fiscalYear
            || $this->biddingStartAt?->getTimestamp() !== $biddingStartAt?->getTimestamp()
            || $this->biddingEndAt?->getTimestamp() !== $biddingEndAt?->getTimestamp();

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

        if ($changed && $this->status instanceof Approved) {
            $this->sendBackForReview();
        }

        return $changed;
    }

    /**
     * Whether the bidding window still lets a published or bidding TOR move
     * on: a published TOR needs a bidding start ahead of now, or it never
     * opens (OpenDueBiddingWindowsUseCase), and both need a bid deadline
     * that has not passed. Any other step is free to change its window.
     */
    public function hasBiddingWindowForProgress(CarbonImmutable $now): bool
    {
        if ($this->status instanceof Published) {
            return $this->biddingStartAt !== null
                && $this->biddingStartAt->greaterThan($now)
                && $this->biddingEndAt !== null
                && $this->biddingEndAt->greaterThan($this->biddingStartAt);
        }

        if ($this->status instanceof Bidding) {
            return $this->biddingStartAt !== null
                && $this->biddingEndAt !== null
                && $this->biddingEndAt->greaterThan($now);
        }

        return true;
    }

    /**
     * Whether the drafter may still edit the TOR without the status lock
     * being lifted: while drafting, after being sent back, or once approved
     * (which sends it back for review, see update()).
     */
    public function isEditable(): bool
    {
        return $this->status instanceof Draft
            || $this->status instanceof RevisionRequired
            || $this->status instanceof Approved;
    }

    /**
     * Whether the TOR may still be deleted without the status lock being
     * lifted: only before it has been sent for review, or after being sent
     * back. Later on it can only be cancelled.
     */
    public function isDeletable(): bool
    {
        return $this->status instanceof Draft
            || $this->status instanceof RevisionRequired;
    }

    /**
     * Withdraw the approval of an approved TOR, including the approver's
     * remark, so it goes back for review as any edit after approval requires
     * (CONTEXT.md).
     *
     * @throws TransitionNotFound
     */
    public function sendBackForReview(): void
    {
        $this->transitionTo(new InReview($this));
        $this->approvedBy = null;
        $this->approvedAt = null;
        $this->remark = null;
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
