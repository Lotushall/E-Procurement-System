<?php

namespace App\Modules\User\Domain\Enums;

enum UserType: string
{
    case Internal = 'internal';
    case Company = 'company';
    case Individual = 'individual';
}
