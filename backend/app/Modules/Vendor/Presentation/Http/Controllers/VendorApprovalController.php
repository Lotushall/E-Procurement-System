<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\CountVendorProfilesByStatusQuery;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

class VendorApprovalController extends Controller
{
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
        private readonly CountVendorProfilesByStatusQuery $countVendorProfilesByStatus,
    ) {}

    public function index(ListVendorsRequest $request): JsonResponse
    {
        $search = $request->validated('search');

        $vendors = $this->listVendorProfiles->execute(
            status: $request->validated('status'),
            search: $search,
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        $counts = $this->countVendorProfilesByStatus->execute($search);

        if ($vendors instanceof LengthAwarePaginator) {
            return VendorProfileResource::collection($vendors->withQueryString())
                ->additional(['meta' => ['counts' => $counts]])
                ->response();
        }

        return response()->json([
            'data' => VendorProfileResource::collection($vendors),
            'meta' => ['counts' => $counts],
        ]);
    }
}
