<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorSummaryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

class VendorApprovalController extends Controller
{
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
    ) {}

    public function index(ListVendorsRequest $request): JsonResponse
    {
        $vendors = $this->listVendorProfiles->execute(
            status: $request->validated('status'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        if ($vendors instanceof LengthAwarePaginator) {
            return VendorSummaryResource::collection($vendors)->response();
        }

        return response()->json([
            'data' => VendorSummaryResource::collection($vendors),
        ]);
    }
}
