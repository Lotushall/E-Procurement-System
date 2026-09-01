<?php

namespace App\Modules\Tender\Domain\Entities\Project;

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\ValueObjects\Project\ProjectCode;
use Carbon\CarbonImmutable;

final class TenderProject
{
    private function __construct(
        private readonly ?int $id,
        private ProjectCode $projectCode,
        private string $name,
        private ?string $description,
        private Money $budget,
        private int $departmentId,
        private ?int $personInChargeId,
        private readonly ?int $createdBy,
        private string $procurementMethod,
        private int $fiscalYear,
        private ?CarbonImmutable $projectStartAt,
        private ?CarbonImmutable $projectEndAt,
        private string $status,
    ) {}

    public static function create(
        ProjectCode $projectCode,
        string $name,
        ?string $description,
        Money $budget,
        int $departmentId,
        ?int $personInChargeId,
        ?int $createdBy,
        string $procurementMethod,
        int $fiscalYear,
        ?CarbonImmutable $projectStartAt,
        ?CarbonImmutable $projectEndAt,
    ): self {
        return new self(
            id: null,
            projectCode: $projectCode,
            name: $name,
            description: $description,
            budget: $budget,
            departmentId: $departmentId,
            personInChargeId: $personInChargeId,
            createdBy: $createdBy,
            procurementMethod: $procurementMethod,
            fiscalYear: $fiscalYear,
            projectStartAt: $projectStartAt,
            projectEndAt: $projectEndAt,
            status: 'draft',
        );
    }

    public static function reconstitute(
        int $id,
        ProjectCode $projectCode,
        string $name,
        ?string $description,
        Money $budget,
        int $departmentId,
        ?int $personInChargeId,
        ?int $createdBy,
        string $procurementMethod,
        int $fiscalYear,
        ?CarbonImmutable $projectStartAt,
        ?CarbonImmutable $projectEndAt,
        string $status,
    ): self {
        return new self(
            id: $id,
            projectCode: $projectCode,
            name: $name,
            description: $description,
            budget: $budget,
            departmentId: $departmentId,
            personInChargeId: $personInChargeId,
            createdBy: $createdBy,
            procurementMethod: $procurementMethod,
            fiscalYear: $fiscalYear,
            projectStartAt: $projectStartAt,
            projectEndAt: $projectEndAt,
            status: $status,
        );
    }

    public function update(
        ProjectCode $projectCode,
        string $name,
        ?string $description,
        Money $budget,
        int $departmentId,
        ?int $personInChargeId,
        string $procurementMethod,
        int $fiscalYear,
        ?CarbonImmutable $projectStartAt,
        ?CarbonImmutable $projectEndAt,
    ): void {
        $this->projectCode = $projectCode;
        $this->name = $name;
        $this->description = $description;
        $this->budget = $budget;
        $this->departmentId = $departmentId;
        $this->personInChargeId = $personInChargeId;
        $this->procurementMethod = $procurementMethod;
        $this->fiscalYear = $fiscalYear;
        $this->projectStartAt = $projectStartAt;
        $this->projectEndAt = $projectEndAt;
    }

    public function changeStatus(string $status): void
    {
        $this->status = $status;
    }

    // -----------------------------
    // Getters
    // -----------------------------
    public function id(): ?int
    {
        return $this->id;
    }

    public function projectCode(): ProjectCode
    {
        return $this->projectCode;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function description(): ?string
    {
        return $this->description;
    }

    public function budget(): Money
    {
        return $this->budget;
    }

    public function departmentId(): int
    {
        return $this->departmentId;
    }

    public function personInChargeId(): ?int
    {
        return $this->personInChargeId;
    }

    public function createdBy(): ?int
    {
        return $this->createdBy;
    }

    public function procurementMethod(): string
    {
        return $this->procurementMethod;
    }

    public function fiscalYear(): int
    {
        return $this->fiscalYear;
    }

    public function projectStartAt(): ?CarbonImmutable
    {
        return $this->projectStartAt;
    }

    public function projectEndAt(): ?CarbonImmutable
    {
        return $this->projectEndAt;
    }

    public function status(): string
    {
        return $this->status;
    }
}
