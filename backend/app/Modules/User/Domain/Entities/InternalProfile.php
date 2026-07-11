<?php

namespace App\Modules\User\Domain\Entities;

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
        private ?string $department,
        private ?string $position,
        private ?PhoneNumber $phone,
    ) {}

    public static function create(
        int $userId,
        ?string $employeeNo,
        ?string $prefix,
        string $firstname,
        string $lastname,
        ?string $department,
        ?string $position,
        ?PhoneNumber $phone,
    ): self {
        return new self(
            id: null,
            userId: $userId,
            employeeNo: $employeeNo,
            prefix: $prefix,
            firstname: $firstname,
            lastname: $lastname,
            department: $department,
            position: $position,
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
        ?string $department,
        ?string $position,
        ?PhoneNumber $phone,
    ): self {
        return new self(
            id: $id,
            userId: $userId,
            employeeNo: $employeeNo,
            prefix: $prefix,
            firstname: $firstname,
            lastname: $lastname,
            department: $department,
            position: $position,
            phone: $phone,
        );
    }

    public function update(
        ?string $employeeNo,
        ?string $prefix,
        string $firstname,
        string $lastname,
        ?string $department,
        ?string $position,
        ?PhoneNumber $phone,
    ): void {
        $this->employeeNo = $employeeNo;
        $this->prefix = $prefix;
        $this->firstname = $firstname;
        $this->lastname = $lastname;
        $this->department = $department;
        $this->position = $position;
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

    public function department(): ?string
    {
        return $this->department;
    }

    public function position(): ?string
    {
        return $this->position;
    }

    public function phone(): ?PhoneNumber
    {
        return $this->phone;
    }
}
