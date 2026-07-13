<?php

namespace App\Modules\User\Infrastructure\Models;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\ModelStates\HasStates;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['username', 'email', 'password', 'user_type', 'status'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasStates, Notifiable;

    /**
     * The model's default values for attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'pending',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'user_type' => UserType::class,
            'status' => UserStatus::class,
        ];
    }

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }

    /**
     * Laravel's class-cast cache is primed with the default state during
     * construction (HasStates reads $this->status while checking for a
     * null default). That stale cache entry survives into
     * syncOriginal()'s internal getAttributes() call below, which merges
     * it back over the real hydrated value before it's cleared — so a
     * freshly-fetched non-default state (e.g. Suspended) silently reverts
     * to the default (Pending). Clearing the cache first prevents the
     * stale merge.
     */
    public function setRawAttributes(array $attributes, $sync = false)
    {
        $this->classCastCache = [];
        $this->attributeCastCache = [];

        return parent::setRawAttributes($attributes, $sync);
    }
}
