<?php

namespace App\Modules\User\Domain\Enums;

enum Permission: string
{
    case VendorsView = 'vendors.view';
    case VendorsReview = 'vendors.review';
    case UsersCreate = 'users.create';
    case UsersUpdate = 'users.update';
    case UsersUpdateStatus = 'users.updateStatus';
    case RolesManage = 'roles.manage';

    public function label(): string
    {
        return match ($this) {
            self::VendorsView => 'ดูรายชื่อผู้ค้า',
            self::VendorsReview => 'อนุมัติ/ปฏิเสธผู้ค้า',
            self::UsersCreate => 'เพิ่ม user',
            self::UsersUpdate => 'แก้ไข user',
            self::UsersUpdateStatus => 'เปลี่ยนสถานะ user',
            self::RolesManage => 'จัดการ role และสิทธิ์',
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::VendorsView, self::VendorsReview => 'ผู้ค้า',
            self::UsersCreate, self::UsersUpdate, self::UsersUpdateStatus => 'ผู้ใช้',
            self::RolesManage => 'Role/สิทธิ์',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
