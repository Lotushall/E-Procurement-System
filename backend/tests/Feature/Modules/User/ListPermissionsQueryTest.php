<?php

use App\Modules\User\Application\Queries\ListPermissionsQuery;

test('execute returns the fixed permission catalog with labels and groups', function () {
    $result = app(ListPermissionsQuery::class)->execute();

    expect($result)->toBe([
        ['name' => 'vendors.view', 'label' => 'ดูรายชื่อผู้ค้า', 'group' => 'ผู้ค้า'],
        ['name' => 'vendors.review', 'label' => 'อนุมัติ/ปฏิเสธผู้ค้า', 'group' => 'ผู้ค้า'],
        ['name' => 'users.create', 'label' => 'เพิ่ม user', 'group' => 'ผู้ใช้'],
        ['name' => 'users.update', 'label' => 'แก้ไข user', 'group' => 'ผู้ใช้'],
        ['name' => 'users.updateStatus', 'label' => 'เปลี่ยนสถานะ user', 'group' => 'ผู้ใช้'],
        ['name' => 'roles.manage', 'label' => 'จัดการ role และสิทธิ์', 'group' => 'Role/สิทธิ์'],
    ]);
});
