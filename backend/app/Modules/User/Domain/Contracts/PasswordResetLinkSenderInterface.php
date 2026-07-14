<?php

namespace App\Modules\User\Domain\Contracts;

interface PasswordResetLinkSenderInterface
{
    public function sendResetLink(string $email): void;
}
