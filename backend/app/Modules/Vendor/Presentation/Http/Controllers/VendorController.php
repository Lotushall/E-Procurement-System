<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Application\Queries\GetVendorProfileQuery;
use App\Modules\Vendor\Application\UseCases\UpdateVendorContactUseCase;
use App\Modules\Vendor\Application\UseCases\UpdateVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\UpdateVendorInfoUseCase;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorContactRequest;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorInfoRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class VendorController extends Controller
{
    public function __construct(
        private readonly GetVendorProfileQuery $getVendorProfile,
        private readonly UpdateVendorInfoUseCase $updateVendorInfo,
        private readonly UpdateVendorContactUseCase $updateVendorContact,
        private readonly UpdateVendorDocumentUseCase $updateVendorDocument,
    ) {}

    public function profile(Request $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        return response()->json([
            'data' => new VendorProfileResource($vendorProfile),
        ]);
    }

    public function updateVendorInfo(UpdateVendorInfoRequest $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->updateVendorInfo->execute(
                $vendorProfile->id,
                UpdateVendorInfoData::from($request->validated())
            );
        } catch (Throwable $th) {
            app_log('Vendor info update failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'บันทึกข้อมูลกิจการไม่สำเร็จ'], 500);
        }

        return response()->json([
            'message' => 'บันทึกข้อมูลกิจการสำเร็จ',
            'data' => new VendorProfileResource($this->getVendorProfile->execute($request->user()->id)),
        ]);
    }

    public function updateVendorContact(UpdateVendorContactRequest $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->updateVendorContact->execute(
                $vendorProfile->id,
                UpdateVendorContactData::from($request->validated())
            );
        } catch (Throwable $th) {
            app_log('Vendor contact update failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'บันทึกข้อมูลผู้ติดต่อไม่สำเร็จ'], 500);
        }

        return response()->json([
            'message' => 'บันทึกข้อมูลผู้ติดต่อสำเร็จ',
            'data' => new VendorProfileResource($this->getVendorProfile->execute($request->user()->id)),
        ]);
    }

    public function updateVendorDocument(UpdateVendorDocumentRequest $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->updateVendorDocument->execute(
                $vendorProfile->id,
                UpdateVendorDocumentData::from($request->validated())
            );
        } catch (Throwable $th) {
            app_log('Vendor document upload failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'อัปโหลดเอกสารไม่สำเร็จ'], 500);
        }

        return response()->json([
            'message' => 'อัปโหลดเอกสารสำเร็จ',
            'data' => new VendorProfileResource($this->getVendorProfile->execute($request->user()->id)),
        ]);
    }
}
