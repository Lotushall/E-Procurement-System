<?php

namespace Database\Factories;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * An internal user with vendor-approval access (there is currently only
     * one internal tier, so this grants the same permissions the seeded
     * "admin" role has — see AdminUserSeeder).
     */
    public function internal(): static
    {
        return $this->state(['user_type' => UserType::Internal])
            ->afterCreating(function (User $user) {
                $user->givePermissionTo([
                    Permission::firstOrCreate(['name' => 'vendors.viewAny', 'guard_name' => 'web']),
                    Permission::firstOrCreate(['name' => 'vendors.review', 'guard_name' => 'web']),
                    Permission::firstOrCreate(['name' => 'vendors.delete', 'guard_name' => 'web']),
                ]);
            });
    }

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'username' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'user_type' => fake()->randomElement(['internal', 'company', 'individual']),
            'status' => 'active',
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
