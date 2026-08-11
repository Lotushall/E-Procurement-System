<?php

namespace App\Modules\Vendor\Infrastructure\Notifications\Support;

final class DocumentTypeLabels
{
    private const LABELS = [
        'company_certificate' => 'หนังสือรับรองบริษัท',
        'authorized_person_id' => 'สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ',
        'vat_registration' => 'ใบทะเบียนภาษีมูลค่าเพิ่ม',
        'shareholder_list' => 'บัญชีรายชื่อผู้ถือหุ้น (บอจ.5)',
        'financial_statement' => 'งบการเงิน / หนังสือรับรองฐานะการเงิน',
        'citizen_id' => 'สำเนาบัตรประชาชน',
        'house_registration' => 'สำเนาทะเบียนบ้าน',
        'commercial_registration' => 'ทะเบียนพาณิชย์',
    ];

    public static function label(string $documentType): string
    {
        return self::LABELS[$documentType] ?? $documentType;
    }
}
