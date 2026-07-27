<?php

namespace Database\Seeders;

use App\Modules\User\Application\DTOs\CreateInternalUserData;
use App\Modules\User\Application\UseCases\CreateInternalUserUseCase;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the "admin" role and a default admin account.
     */
    public function run(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

        if (app(UserRepositoryInterface::class)->findByEmail('admin@example.com') !== null) {
            return;
        }

        app(CreateInternalUserUseCase::class)->execute(new CreateInternalUserData(
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin',
            role: 'admin',
            firstname: 'System',
            lastname: 'Administrator',
        ));
    }
}
