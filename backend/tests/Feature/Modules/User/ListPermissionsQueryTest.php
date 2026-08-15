<?php

use App\Modules\User\Application\Queries\ListPermissionsQuery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

test('execute returns permissions from the database with label and name-derived group', function () {
    Permission::create(['name' => 'vendors.view', 'guard_name' => 'web', 'label' => 'ดูรายชื่อผู้ค้า']);
    Permission::create(['name' => 'users.create', 'guard_name' => 'web', 'label' => 'เพิ่ม user']);

    $result = app(ListPermissionsQuery::class)->execute();

    expect($result)->toBe([
        ['name' => 'vendors.view', 'label' => 'ดูรายชื่อผู้ค้า', 'group' => 'vendors'],
        ['name' => 'users.create', 'label' => 'เพิ่ม user', 'group' => 'users'],
    ]);
});

test('execute falls back to name when label is not set', function () {
    Permission::create(['name' => 'reports.export', 'guard_name' => 'web']);

    $result = app(ListPermissionsQuery::class)->execute();

    expect($result)->toBe([
        ['name' => 'reports.export', 'label' => 'reports.export', 'group' => 'reports'],
    ]);
});
