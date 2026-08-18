<?php

use App\Modules\User\Application\DTOs\PermissionData;
use App\Modules\User\Application\UseCases\CreatePermissionUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('execute creates a permission with the given name and label', function () {
    $permission = app(CreatePermissionUseCase::class)->execute(new PermissionData(
        name: 'reports.export',
        label: 'ส่งออกรายงาน',
    ));

    expect($permission->name)->toBe('reports.export')
        ->and($permission->label)->toBe('ส่งออกรายงาน');

    $this->assertDatabaseHas('permissions', [
        'name' => 'reports.export',
        'label' => 'ส่งออกรายงาน',
        'guard_name' => 'web',
    ]);
});
