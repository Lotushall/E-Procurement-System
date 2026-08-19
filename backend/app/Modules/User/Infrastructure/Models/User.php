<?php

namespace App\Modules\User\Infrastructure\Models;

use App\Modules\User\Domain\Enums\UserType;
use App\Modules\User\Domain\States\UserStatus;
use App\Modules\User\Infrastructure\Notifications\QueuedResetPassword;
use App\Modules\User\Infrastructure\Notifications\QueuedVerifyEmail;
use App\Modules\Vendor\Infrastructure\Models\VendorCompanyDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorIndividualDetails;
use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\ModelStates\HasStates;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['username', 'email', 'password', 'user_type', 'status', 'last_login_at', 'password_changed_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasStates, Notifiable, SoftDeletes;

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
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
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
     * Send the email verification notification, queued rather than the
     * synchronous default from the MustVerifyEmail trait.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new QueuedVerifyEmail);
    }

    /**
     * Send the password reset notification, queued rather than the
     * synchronous default from the CanResetPassword trait.
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new QueuedResetPassword($token));
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

    // Relations
    public function UserVendorProfile(): HasOne
    {
        return $this->hasOne(VendorProfiles::class);
    }

    public function UserInternalProfile(): HasOne
    {
        return $this->hasOne(InternalProfiles::class);
    }

    /**
     * Scope a query to only include users of the given type.
     */
    #[Scope]
    protected function type(Builder $query, ?string $type): void
    {
        $query->when($type !== null, fn (Builder $query) => $query->where('user_type', $type));
    }

    /**
     * Scope a query to only include users with the given status.
     */
    #[Scope]
    protected function status(Builder $query, ?string $status): void
    {
        $query->when($status !== null, fn (Builder $query) => $query->where('status', $status));
    }

    /**
     * Scope a query to users whose username, email, resolved internal name, company
     * name, or individual store name matches the given search term.
     */
    #[Scope]
    protected function search(Builder $query, ?string $search): void
    {
        if ($search === null || trim($search) === '') {
            return;
        }

        $term = '%'.$search.'%';

        $query->where(function (Builder $query) use ($term) {
            $query->where('username', 'like', $term)
                ->orWhere('email', 'like', $term)
                ->orWhereIn('id', InternalProfiles::query()
                    ->where(function (Builder $query) use ($term) {
                        $query->where('firstname', 'like', $term)
                            ->orWhere('lastname', 'like', $term);
                    })
                    ->select('user_id'))
                ->orWhereIn('id', VendorProfiles::query()
                    ->whereIn('id', VendorCompanyDetails::query()
                        ->where('company_name', 'like', $term)
                        ->select('vendor_profile_id'))
                    ->select('user_id'))
                ->orWhereIn('id', VendorProfiles::query()
                    ->whereIn('id', VendorIndividualDetails::query()
                        ->where('store_name', 'like', $term)
                        ->select('vendor_profile_id'))
                    ->select('user_id'));
        });
    }

    /**
     * Scope a query to sort by the given whitelisted column (defaults to created_at).
     */
    #[Scope]
    protected function sort(Builder $query, ?string $sortBy, ?string $sortDirection = null): void
    {
        $direction = $sortDirection === 'asc' ? 'asc' : 'desc';

        $query->orderBy(
            in_array($sortBy, ['username', 'email'], true) ? $sortBy : 'created_at',
            $direction,
        );
    }
}
