<?php

namespace App\Modules\Tender\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tender\Application\Tor\Queries\GetTorByIdQuery;
use App\Modules\Tender\Application\Tor\Queries\ListTorsQuery;
use App\Modules\Tender\Presentation\Http\Requests\Tor\ListTorsRequest;
use App\Modules\Tender\Presentation\Http\Resources\Tor\TorResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TorController extends Controller
{
    public function __construct(
        private readonly ListTorsQuery $listTors,
        private readonly GetTorByIdQuery $getTorById,
    ) {}

    public function index(ListTorsRequest $request): JsonResponse
    {
        $tors = $this->listTors->execute(
            viewer: $request->user(),
            search: $request->validated('search'),
            status: $request->validated('status'),
            departmentId: $request->validated('department_id'),
            fiscalYear: $request->validated('fiscal_year'),
            tenderProject: $request->validated('tender_project_id'),
            procurementMethod: $request->validated('procurement_method'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => TorResource::collection($tors->getCollection()),
            'meta' => [
                'currentPage' => $tors->currentPage(),
                'lastPage' => $tors->lastPage(),
                'perPage' => $tors->perPage(),
                'total' => $tors->total(),
            ],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json([
            'data' => new TorResource($this->getTorById->execute($id, $request->user())),
        ]);
    }
}
