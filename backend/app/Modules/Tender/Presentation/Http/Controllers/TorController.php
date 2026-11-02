<?php

namespace App\Modules\Tender\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tender\Application\Tor\DTOs\CreateTorData;
use App\Modules\Tender\Application\Tor\DTOs\UpdateTorData;
use App\Modules\Tender\Application\Tor\Queries\GetTorByIdQuery;
use App\Modules\Tender\Application\Tor\Queries\ListTorsQuery;
use App\Modules\Tender\Application\Tor\UseCases\CreateTorUseCase;
use App\Modules\Tender\Application\Tor\UseCases\DeleteTorUseCase;
use App\Modules\Tender\Application\Tor\UseCases\UpdateTorUseCase;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\Tender\Presentation\Http\Requests\Tor\ListTorsRequest;
use App\Modules\Tender\Presentation\Http\Requests\Tor\StoreTorRequest;
use App\Modules\Tender\Presentation\Http\Requests\Tor\UpdateTorRequest;
use App\Modules\Tender\Presentation\Http\Resources\Tor\TorResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TorController extends Controller
{
    public function __construct(
        private readonly ListTorsQuery $listTors,
        private readonly GetTorByIdQuery $getTorById,
        private readonly CreateTorUseCase $createTor,
        private readonly UpdateTorUseCase $updateTor,
        private readonly DeleteTorUseCase $deleteTor,
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

    public function store(StoreTorRequest $request): JsonResponse
    {
        $tor = $this->createTor->execute(
            CreateTorData::from($request->validated()),
            $request->user()->id,
        );

        return response()->json([
            'data' => new TorResource($this->savedTor($tor->id())),
        ], 201);
    }

    /**
     * A TOR outside the user's visibility is reported as missing (404),
     * exactly like show().
     */
    public function update(UpdateTorRequest $request, int $id): JsonResponse
    {
        $this->getTorById->ensureVisible($id, $request->user());

        $result = $this->updateTor->execute(
            $id,
            UpdateTorData::from($request->validated()),
            $request->user()->id,
            Gate::allows('tors.ignoreStatusLock'),
        );

        if (is_string($result)) {
            return response()->json(['message' => $result], 422);
        }

        return response()->json([
            'data' => new TorResource($this->savedTor($result->id())),
        ]);
    }

    /**
     * A TOR outside the user's visibility is reported as missing (404),
     * exactly like show().
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->getTorById->ensureVisible($id, $request->user());

        $message = $this->deleteTor->execute($id, $request->user()->id, Gate::allows('tors.ignoreStatusLock'));

        if ($message !== null) {
            return response()->json(['message' => $message], 422);
        }

        return response()->json(null, 204);
    }

    /**
     * The TOR just written, loaded without the visibility scope: a department
     * viewer who did not create the TOR may have moved it into a department
     * they cannot see, and the response must still describe what was saved.
     */
    private function savedTor(int $id): Tors
    {
        return Tors::query()->with(Tors::RESOURCE_RELATIONS)->findOrFail($id);
    }
}
