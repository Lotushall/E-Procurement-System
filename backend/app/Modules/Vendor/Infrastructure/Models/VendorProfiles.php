<?php

namespace App\Modules\Vendor\Infrastructure\Models;

use App\Modules\User\Infrastructure\Models\User;
use App\Modules\Vendor\Domain\States\VerificationStatus;
use Database\Factories\VendorProfilesFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use Spatie\ModelStates\HasStates;

#[Table('vendor_profiles')]
#[Fillable([
    'user_id',
    'verification_status',
    'verified_at',
    'verified_by',
    'remark',
])]
class VendorProfiles extends Model
{
    use HasFactory, HasStates;

    protected static function newFactory(): VendorProfilesFactory
    {
        return VendorProfilesFactory::new();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'verification_status' => VerificationStatus::class,
        ];
    }

    // Relations
    public function VendorProfilesUser(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function VendorProfilesVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function VendorProfilesCompanyDetail(): HasOne
    {
        return $this->hasOne(VendorCompanyDetails::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesIndividualDetail(): HasOne
    {
        return $this->hasOne(VendorIndividualDetails::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesDocuments(): HasMany
    {
        return $this->hasMany(VendorDocuments::class, 'vendor_profile_id', 'id');
    }

    public function VendorProfilesContact(): HasMany
    {
        return $this->hasMany(VendorContact::class, 'vendor_profile_id', 'id');
    }

    /**
     * Scope a query to only include vendor profiles with the given verification status.
     */
    #[Scope]
    protected function status(Builder $query, ?string $status): void
    {
        $query->when($status !== null, fn(Builder $query) => $query->where('verification_status', $status));
    }

    /**
     * Scope a query to vendor profiles whose company name, individual store name/owner
     * name, or account email matches the given search term.
     */
    #[Scope]
    protected function search(Builder $query, ?string $search): void
    {
        if ($search === null || trim($search) === '') {
            return;
        }

        $term = '%' . $search . '%';

        $query->where(function (Builder $query) use ($term) {
            $query->whereIn('id', VendorCompanyDetails::query()
                ->where('company_name', 'like', $term)
                ->select('vendor_profile_id'))
                ->orWhereIn('id', VendorIndividualDetails::query()
                    ->where(function (Builder $query) use ($term) {
                        $query->where('store_name', 'like', $term)
                            ->orWhere('firstname', 'like', $term)
                            ->orWhere('lastname', 'like', $term);
                    })
                    ->select('vendor_profile_id'))
                ->orWhereIn('user_id', User::query()
                    ->where('email', 'like', $term)
                    ->select('id'));
        });
    }

    /**
     * Scope a query to sort by the given whitelisted column.
     *
     * `user_type` and `business_type` live on related tables, so they're sorted via
     * correlated subqueries (per advanced-queries guidance) instead of joins, to avoid
     * disturbing the parent select/eager-load and risking duplicate/renamed columns.
     */
    #[Scope]
    protected function sort(Builder $query, ?string $sortBy, ?string $sortDirection = null): void
    {
        $direction = $sortDirection === 'asc' ? 'asc' : 'desc';

        match ($sortBy) {
            'verification_status' => $query->orderBy('verification_status', $direction),
            'user_type' => $query->orderBy(
                User::select('user_type')->whereColumn('users.id', 'vendor_profiles.user_id'),
                $direction
            ),
            'business_type' => $query->orderBy(
                DB::raw('(
                    select coalesce(
                        (select business_type from vendor_company_details where vendor_company_details.vendor_profile_id = vendor_profiles.id),
                        (select business_type from vendor_individual_details where vendor_individual_details.vendor_profile_id = vendor_profiles.id)
                    )
                )'),
                $direction
            ),
            default => $query->orderBy('created_at', $direction),
        };
    }
}
