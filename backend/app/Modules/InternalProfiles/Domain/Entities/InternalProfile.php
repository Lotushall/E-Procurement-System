<?php

namespace App\Modules\InternalProfiles\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\PhoneNumber;

final class InternalProfile
{
    private function __construct(
        private readonly ?int $id,
        private readonly int $userId,
        private ?string $employeeNo,
        private ?string $prefix,
        private string $firstname,
        private string $lastname,
        private ?int $departmentId,
        private ?int $positionId,
        private ?PhoneNumber $phone,
    ) {}

    public static function create(
        int $userId,
        ?string $employeeNo,
        ?string $prefix,
        string $firstname,
        string $lastname,
        ?int $departmentId,
        ?int $positionId,
        ?PhoneNumber $phone,
    ): self {
        return new self(
            id: null,
            userId: $userId,
            employeeNo: $employeeNo,
            prefix: $prefix,
            firstname: $firstname,
            lastname: $lastname,
            departmentId: $departmentId,
            positionId: $positionId,
            phone: $phone,
        );
    }

    public static function reconstitute(
        int $id,
        int $userId,
        ?string $employeeNo,
        ?string $prefix,
        string $firstname,
        string $lastname,
        ?int $departmentId,
        ?int $positionId,
        ?PhoneNumber $phone,
    ): self {
        return new self(
            id: $id,
            userId: $userId,
            employeeNo: $employeeNo,
            prefix: $prefix,
            firstname: $firstname,
            lastname: $lastname,
            departmentId: $departmentId,
            positionId: $positionId,
            phone: $phone,
        );
    }

    public function update(
        ?string $employeeNo,
        ?string $prefix,
        string $firstname,
        string $lastname,
        ?int $departmentId,
        ?int $positionId,
        ?PhoneNumber $phone,
    ): void {
        $this->employeeNo = $employeeNo;
        $this->prefix = $prefix;
        $this->firstname = $firstname;
        $this->lastname = $lastname;
        $this->departmentId = $departmentId;
        $this->positionId = $positionId;
        $this->phone = $phone;
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

    public function employeeNo(): ?string
    {
        return $this->employeeNo;
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

    public function departmentId(): ?int
    {
        return $this->departmentId;
    }

    public function positionId(): ?int
    {
        return $this->positionId;
    }

    public function phone(): ?PhoneNumber
    {
        return $this->phone;
    }
}
