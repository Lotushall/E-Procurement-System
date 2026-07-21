<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Queries\GetVendorProfileQuery;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorContactRequest;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorInfoRequest;
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

    public function updateVendorInfo(UpdateVendorInfoRequest $request) {}

    public function updateVendorContact(UpdateVendorContactRequest $request) {}

    public function updateVendorDocument(UpdateVendorDocumentRequest $request) {}
}
