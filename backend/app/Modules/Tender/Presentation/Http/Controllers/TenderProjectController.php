<?php

namespace App\Modules\Tender\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData;
use App\Modules\Tender\Application\Project\Queries\GetTenderProjectStatsQuery;
use App\Modules\Tender\Application\Project\Queries\ListTenderProjectsQuery;
use App\Modules\Tender\Application\Project\UseCases\CreateTenderProjectUseCase;
use App\Modules\Tender\Presentation\Http\Requests\Project\ListTenderProjectsRequest;
use App\Modules\Tender\Presentation\Http\Requests\Project\StoreTenderProjectRequest;
use App\Modules\Tender\Presentation\Http\Resources\Project\TenderProjectResource;
use Illuminate\Http\JsonResponse;

class TenderProjectController extends Controller
{
    public function __construct(
        private readonly ListTenderProjectsQuery $listTenderProjects,
        private readonly GetTenderProjectStatsQuery $getTenderProjectStats,
        private readonly CreateTenderProjectUseCase $createTenderProject,
    ) {}

    public function index(ListTenderProjectsRequest $request): JsonResponse
    {
        $projects = $this->listTenderProjects->execute(
            search: $request->validated('search'),
            status: $request->validated('status'),
            departmentId: $request->validated('department_id'),
            fiscalYear: $request->validated('fiscal_year'),
            dateFrom: $request->validated('date_from'),
            dateTo: $request->validated('date_to'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => TenderProjectResource::collection($projects->getCollection()),
            'meta' => [
                'currentPage' => $projects->currentPage(),
                'lastPage' => $projects->lastPage(),
                'perPage' => $projects->perPage(),
                'total' => $projects->total(),
                'stats' => $this->getTenderProjectStats->execute(),
            ],
        ]);
    }

    public function store(StoreTenderProjectRequest $request): JsonResponse
    {
        $project = $this->createTenderProject->execute(
            CreateTenderProjectData::from($request->validated()),
            $request->user()->id,
        );

        return response()->json(['data' => new TenderProjectResource($project)], 201);
    }
}
