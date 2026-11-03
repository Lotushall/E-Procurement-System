<?php

namespace App\Modules\Vendor\Domain\Exceptions;

use DomainException;

/**
 * A tax ID, citizen ID or business registration number is already held by
 * another vendor. Callers answer with a generic message that does not say
 * which number, or that any number, is registered.
 */
final class VendorIdentityAlreadyRegisteredException extends DomainException
{
    public const string PUBLIC_MESSAGE = 'ไม่สามารถใช้ข้อมูลนี้ได้ กรุณาตรวจสอบข้อมูลอีกครั้ง หรือติดต่อเจ้าหน้าที่';

    public function __construct()
    {
        parent::__construct('An identification number is already registered to another vendor.');
    }
}
