<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\DTOs\UpdateVendorContactData;
use App\Modules\Vendor\Application\DTOs\UpdateVendorDocumentData;
use App\Modules\Vendor\Application\DTOs\UpdateVendorInfoData;
use App\Modules\Vendor\Application\Queries\GetVendorProfileQuery;
use App\Modules\Vendor\Application\UseCases\DeleteVendorContactUseCase;
use App\Modules\Vendor\Application\UseCases\DeleteVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\SaveVendorContactUseCase;
use App\Modules\Vendor\Application\UseCases\SaveVendorDocumentUseCase;
use App\Modules\Vendor\Application\UseCases\UpdateVendorInfoUseCase;
use App\Modules\Vendor\Application\UseCases\ViewVendorDocumentUseCase;
use App\Modules\Vendor\Presentation\Http\Requests\SaveVendorContactRequest;
use App\Modules\Vendor\Presentation\Http\Requests\SaveVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\UpdateVendorInfoRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class VendorController extends Controller
{
    public function __construct(
        private readonly GetVendorProfileQuery $getVendorProfile,
        private readonly UpdateVendorInfoUseCase $updateVendorInfo,
        private readonly SaveVendorContactUseCase $saveVendorContact,
        private readonly DeleteVendorContactUseCase $deleteVendorContact,
        private readonly SaveVendorDocumentUseCase $saveVendorDocument,
        private readonly DeleteVendorDocumentUseCase $deleteVendorDocument,
        private readonly ViewVendorDocumentUseCase $viewVendorDocument,
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

    public function saveVendorContact(SaveVendorContactRequest $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->saveVendorContact->execute(
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

    public function deleteVendorContact(Request $request, int $contact): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->deleteVendorContact->execute($vendorProfile->id, $contact);
        } catch (Throwable $th) {
            app_log('Vendor contact delete failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'ลบข้อมูลผู้ติดต่อไม่สำเร็จ'], 500);
        }

        return response()->json([
            'message' => 'ลบข้อมูลผู้ติดต่อสำเร็จ',
            'data' => new VendorProfileResource($this->getVendorProfile->execute($request->user()->id)),
        ]);
    }

    public function saveVendorDocument(SaveVendorDocumentRequest $request): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->saveVendorDocument->execute(
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

    public function deleteVendorDocument(Request $request, int $document): JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $this->deleteVendorDocument->execute($vendorProfile->id, $document);
        } catch (Throwable $th) {
            app_log('Vendor document delete failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'ลบเอกสารไม่สำเร็จ'], 500);
        }

        return response()->json([
            'message' => 'ลบเอกสารสำเร็จ',
            'data' => new VendorProfileResource($this->getVendorProfile->execute($request->user()->id)),
        ]);
    }

    public function viewVendorDocument(Request $request, int $document): StreamedResponse|JsonResponse
    {
        $vendorProfile = $this->getVendorProfile->execute($request->user()->id);

        try {
            $document = $this->viewVendorDocument->execute($vendorProfile->id, $document);
        } catch (Throwable $th) {
            app_log('Vendor document view failed.', ['error' => $th], 'error', 'vendor');

            return response()->json(['message' => 'ไม่พบเอกสาร'], 500);
        }

        return Storage::disk('local')->response($document->filePath(), $document->fileName());
    }
}
