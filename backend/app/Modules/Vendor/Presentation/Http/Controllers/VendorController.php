<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\GetVendorProfileQuery;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function __construct(
        private readonly GetVendorProfileQuery $getVendorProfile,
    ) {}

    public function profile(Request $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        return response()->json([
            'data' => new VendorProfileResource($vendorProfile),
        ]);
    }

    public function updateVendorInfo() {}

    public function updateVendorContact() {}

    public function updateVendorDocument() {}
}
