<?php

namespace App\Modules\User\Domain\Entities;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus;
use App\Modules\User\Domain\States\UserStatus\Active;
use App\Modules\User\Domain\States\UserStatus\Inactive;
use App\Modules\User\Domain\States\UserStatus\Pending;
use App\Modules\User\Domain\States\UserStatus\Suspended;
use Carbon\CarbonImmutable;
use DomainException;

final class User
{
    private function __construct(
        private readonly ?int $id,
        private string $username,
        private Email $email,
        private string $password,
        private readonly UserType $userType,
        private UserStatus $status,
        private ?CarbonImmutable $emailVerifiedAt,
        private ?CarbonImmutable $lastLoginAt,
        private ?CarbonImmutable $passwordChangedAt,
        private ?CarbonImmutable $createdAt,
        private ?CarbonImmutable $updatedAt,
    ) {}

    public static function register(
        string $username,
        Email $email,
        string $passwordHash,
        UserType $userType
    ): self {
        return new self(
            id: null,
            username: $username,
            email: $email,
            password: $passwordHash,
            userType: $userType,
            status: new Pending(null),
            emailVerifiedAt: null,
            lastLoginAt: null,
            passwordChangedAt: null,
            createdAt: null,
            updatedAt: null,
        );
    }

    public static function reconstitute(
        int $id,
        string $username,
        Email $email,
        string $passwordHash,
        UserType $userType,
        UserStatus $status,
        ?CarbonImmutable $emailVerifiedAt,
        ?CarbonImmutable $lastLoginAt,
        ?CarbonImmutable $passwordChangedAt,
        CarbonImmutable $createdAt,
        CarbonImmutable $updatedAt,
    ): self {
        return new self(
            id: $id,
            username: $username,
            email: $email,
            password: $passwordHash,
            userType: $userType,
            status: $status,
            emailVerifiedAt: $emailVerifiedAt,
            lastLoginAt: $lastLoginAt,
            passwordChangedAt: $passwordChangedAt,
            createdAt: $createdAt,
            updatedAt: $updatedAt,
        );
    }

    public function activate(): void
    {
        if ($this->status instanceof Active) {
            return;
        }

        $this->status = new Active($this);
        $this->touch();
    }

    public function suspend(): void
    {
        if ($this->status instanceof Suspended) {
            return;
        }

        $this->status = new Suspended($this);
        $this->touch();
    }

    public function deactivate(): void
    {
        if ($this->status instanceof Inactive) {
            return;
        }

        $this->status = new Inactive($this);
        $this->touch();
    }

    public function verifyEmail(): void
    {
        if ($this->emailVerifiedAt !== null) {
            throw new DomainException('Email has already been verified.');
        }

        $this->emailVerifiedAt = CarbonImmutable::now();
        $this->touch();
    }

    public function changeUsername(string $username): void
    {
        if ($this->username === $username) {
            return;
        }

        $this->username = $username;
        $this->touch();
    }

    public function changeEmail(Email $email): void
    {
        if ($this->email->equals($email)) {
            return;
        }

        $this->email = $email;
        $this->emailVerifiedAt = null;
        $this->touch();
    }

    public function changePassword(string $passwordHash): void
    {
        $this->password = $passwordHash;
        $this->passwordChangedAt = CarbonImmutable::now();
        $this->touch();
    }

    public function recordLogin(): void
    {
        $this->lastLoginAt = CarbonImmutable::now();
        $this->touch();
    }

    private function touch(): void
    {
        $this->updatedAt = CarbonImmutable::now();
    }

    // -----------------------------
    // Getters
    // -----------------------------
    public function id(): ?int
    {
        return $this->id;
    }

    public function username(): string
    {
        return $this->username;
    }

    public function email(): Email
    {
        return $this->email;
    }

    public function passwordHash(): string
    {
        return $this->password;
    }

    public function userType(): UserType
    {
        return $this->userType;
    }

    public function status(): UserStatus
    {
        return $this->status;
    }

    public function emailVerifiedAt(): ?CarbonImmutable
    {
        return $this->emailVerifiedAt;
    }

    public function lastLoginAt(): ?CarbonImmutable
    {
        return $this->lastLoginAt;
    }

    public function passwordChangedAt(): ?CarbonImmutable
    {
        return $this->passwordChangedAt;
    }

    public function createdAt(): ?CarbonImmutable
    {
        return $this->createdAt;
    }

    public function updatedAt(): ?CarbonImmutable
    {
        return $this->updatedAt;
    }

    public function isActive(): bool
    {
        return $this->status instanceof Active;
    }

    public function isPending(): bool
    {
        return $this->status instanceof Pending;
    }

    public function isVerified(): bool
    {
        return $this->emailVerifiedAt !== null;
    }
}
