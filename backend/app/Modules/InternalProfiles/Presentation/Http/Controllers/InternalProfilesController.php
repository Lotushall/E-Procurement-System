<?php

namespace App\Modules\InternalProfiles\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\InternalProfiles\Application\Queries\ListIneternalProfilesQuery;
use App\Modules\InternalProfiles\Presentation\Http\Requests\ListInternalProfilesRequest;
use App\Modules\InternalProfiles\Presentation\Http\Resources\InternalProfileResource;

class InternalProfilesController extends Controller
{
    public function __construct(
        private readonly ListIneternalProfilesQuery $listIneternalProfilesQuery
    ) {}

    public function index(ListInternalProfilesRequest $request)
    {
        $internal_profiles = $this->listIneternalProfilesQuery->execute(
            search: $request->validated('search'),
            sortBy: $request->validated('sort_by'),
            sortDirection: $request->validated('sort_direction'),
            page: $request->validated('page'),
            perPage: $request->validated('per_page'),
        );

        return response()->json([
            'data' => InternalProfileResource::collection($internal_profiles->getCollection()),
            'meta' => [
                'currentPage' => $internal_profiles->currentPage(),
                'lastPage' => $internal_profiles->lastPage(),
                'perPage' => $internal_profiles->perPage(),
                'total' => $internal_profiles->total(),
            ],
        ]);
    }

    public function store() {}

    public function update() {}

    public function destroy() {}
}
