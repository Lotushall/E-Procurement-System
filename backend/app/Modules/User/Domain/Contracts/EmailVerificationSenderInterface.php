<?php

namespace App\Modules\User\Domain\Contracts;

interface EmailVerificationSenderInterface
{
    public function sendVerificationEmail(int $userId): void;
}
