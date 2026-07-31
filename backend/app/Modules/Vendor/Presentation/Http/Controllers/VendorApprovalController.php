<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorSummaryResource;
use Illuminate\Http\JsonResponse;

class VendorApprovalController extends Controller
{
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
    ) {}

    public function index(ListVendorsRequest $request): JsonResponse
    {
        $vendors = $this->listVendorProfiles->execute($request->validated('status'));

        return response()->json([
            'data' => VendorSummaryResource::collection($vendors),
        ]);
    }
}
