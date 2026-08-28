<?php

namespace App\Modules\Vendor\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Vendor\Application\Dashboard\Queries\CountVendorProfilesByStatusQuery;
use App\Modules\Vendor\Application\Dashboard\Queries\GetVendorProfileByIdQuery;
use App\Modules\Vendor\Application\Dashboard\Queries\ListVendorProfilesQuery;
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorDocumentUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\ApproveVendorProfileUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\DeleteVendorProfileUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\PendingVendorDocumentUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\PendingVendorProfileUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorDocumentUseCase;
use App\Modules\Vendor\Application\Dashboard\UseCases\RejectVendorProfileUseCase;
use App\Modules\Vendor\Presentation\Http\Requests\ApproveVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ApproveVendorRequest;
use App\Modules\Vendor\Presentation\Http\Requests\ListVendorsRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorDocumentRequest;
use App\Modules\Vendor\Presentation\Http\Requests\RejectVendorRequest;
use App\Modules\Vendor\Presentation\Http\Resources\VendorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class VendorApprovalController extends Controller
{
    public function __construct(
        private readonly ListVendorProfilesQuery $listVendorProfiles,
        private readonly CountVendorProfilesByStatusQuery $countVendorProfilesByStatus,
        private readonly GetVendorProfileByIdQuery $getVendorProfileById,
        private readonly ApproveVendorProfileUseCase $approveVendorProfile,
        private readonly RejectVendorProfileUseCase $rejectVendorProfile,
        private readonly PendingVendorProfileUseCase $pendingVendorProfile,
        private readonly ApproveVendorDocumentUseCase $approveVendorDocument,
        private readonly RejectVendorDocumentUseCase $rejectVendorDocument,
        private readonly PendingVendorDocumentUseCase $pendingVendorDocument,
        private readonly DeleteVendorProfileUseCase $deleteVendorProfile,
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

    public function show(int $id): JsonResponse
    {
        $vendor = $this->getVendorProfileById->execute($id);

        return response()->json([
            'data' => new VendorProfileResource($vendor),
        ]);
    }

    public function approve(ApproveVendorRequest $request, int $id): JsonResponse
    {
        $this->approveVendorProfile->execute(
            $id,
            $request->user()->id,
            $request->validated('remark'),
            $request->boolean('send_email', true),
        );

        return $this->vendorResponse($id);
    }

    public function reject(RejectVendorRequest $request, int $id): JsonResponse
    {
        $this->rejectVendorProfile->execute(
            $id,
            $request->user()->id,
            $request->validated('remark'),
            $request->boolean('send_email', true),
        );

        return $this->vendorResponse($id);
    }

    public function pending(int $id): JsonResponse
    {
        $this->pendingVendorProfile->execute($id);

        return $this->vendorResponse($id);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->deleteVendorProfile->execute($id, $request->user()->id);

        return response()->json(null, 204);
    }

    public function approveDocument(ApproveVendorDocumentRequest $request, int $vendorId, int $documentId): JsonResponse
    {
        $this->approveVendorDocument->execute(
            $vendorId,
            $documentId,
            $request->user()->id,
            $request->boolean('send_email', true),
        );

        return $this->vendorResponse($vendorId);
    }

    public function rejectDocument(RejectVendorDocumentRequest $request, int $vendorId, int $documentId): JsonResponse
    {
        $this->rejectVendorDocument->execute(
            $vendorId,
            $documentId,
            $request->user()->id,
            $request->validated('remark'),
            $request->boolean('send_email', true),
        );

        return $this->vendorResponse($vendorId);
    }

    public function pendingDocument(int $vendorId, int $documentId): JsonResponse
    {
        $this->pendingVendorDocument->execute($vendorId, $documentId);

        return $this->vendorResponse($vendorId);
    }

    private function vendorResponse(int $id): JsonResponse
    {
        return response()->json([
            'data' => new VendorProfileResource($this->getVendorProfileById->execute($id)),
        ]);
    }
}
