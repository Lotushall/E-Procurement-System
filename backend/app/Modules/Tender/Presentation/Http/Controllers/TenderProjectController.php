<?php

namespace App\Modules\Tender\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tender\Application\Project\DTOs\CreateTenderProjectData;
use App\Modules\Tender\Application\Project\UseCases\CreateTenderProjectUseCase;
use App\Modules\Tender\Presentation\Http\Requests\Project\StoreTenderProjectRequest;
use App\Modules\Tender\Presentation\Http\Resources\Project\TenderProjectResource;
use Illuminate\Http\JsonResponse;

class TenderProjectController extends Controller
{
    public function __construct(
        private readonly CreateTenderProjectUseCase $createTenderProject,
    ) {}

    public function store(StoreTenderProjectRequest $request): JsonResponse
    {
        $project = $this->createTenderProject->execute(
            CreateTenderProjectData::from($request->validated()),
            $request->user()->id,
        );

        return response()->json(['data' => new TenderProjectResource($project)], 201);
    }
}
