<?php

namespace App\Modules\Vendor\Application\Dashboard\Queries;

use App\Modules\Vendor\Infrastructure\Models\VendorProfiles;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListVendorProfilesQuery
{
    private const DEFAULT_PER_PAGE = 20;

    public function execute(
        ?string $status,
        ?string $search = null,
        ?string $sortBy = null,
        ?string $sortDirection = null,
        ?int $page = null,
        ?int $perPage = null,
    ): Collection|LengthAwarePaginator {
        $query = VendorProfiles::query()
            ->select(['id', 'created_at', 'updated_at', 'verification_status'])
            ->whereHas('VendorProfilesUser')
            ->withCount([
                'VendorProfilesDocuments as approved_documents_count' => fn ($q) => $q->where('status', 'approved'),
                'VendorProfilesDocuments as pending_documents_count' => fn ($q) => $q->where('status', 'pending'),
                'VendorProfilesDocuments as rejected_documents_count' => fn ($q) => $q->where('status', 'rejected'),
            ])
            ->with([
                'VendorProfilesCompanyDetail:vendor_profile_id,company_name,business_type',
                'VendorProfilesIndividualDetail:vendor_profile_id,store_name,business_type',
                'VendorProfilesContact:vendor_profile_id,contact_email,contact_phone,is_main_contact',
            ])
            ->status($status)
            ->search($search)
            ->sort($sortBy, $sortDirection)
            ->orderByDesc('id');

        if ($page === null && $perPage === null) {
            return $query->get();
        }

        return $query->paginate(
            perPage: $perPage ?? self::DEFAULT_PER_PAGE,
            page: $page ?? 1,
        );
    }
}
