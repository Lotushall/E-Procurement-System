<?php

namespace App\Modules\Tender\Presentation\Http\Requests\Tor;

use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreTorRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'scopeOfWork' => ['required', 'string'],
            'departmentId' => ['required', 'integer', Rule::exists('departments', 'id')],
            'tenderProjectId' => ['nullable', 'integer', Rule::exists('tenders_projects', 'id')],
            'budgetEstimate' => ['required', 'numeric', 'min:0', 'decimal:0,2', 'max:999999999999.99'],
            'procurementMethod' => ['required', 'string', 'max:255'],
            'fiscalYear' => ['required', 'integer', 'between:0,65535'],
            'biddingStartAt' => ['nullable', 'date'],
            'biddingEndAt' => ['nullable', 'date', 'after:biddingStartAt'],
        ];
    }

    /**
     * Project statuses that still take TORs. A TOR already in a project that
     * has since moved on keeps it; only joining such a project is refused.
     *
     * @var list<string>
     */
    private const array OPEN_PROJECT_STATUSES = ['draft', 'published'];

    /**
     * A tender project groups TORs of one owning department (CONTEXT.md), so
     * a TOR placed in a project must belong to that project's department, and
     * only a project still open may receive a TOR.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['departmentId', 'tenderProjectId'])) {
                    return;
                }

                $tenderProjectId = $this->input('tenderProjectId');

                if ($tenderProjectId === null) {
                    return;
                }

                $project = TenderProjects::query()->select(['id', 'department_id', 'status'])->find($tenderProjectId);

                if ((int) $project->department_id !== (int) $this->input('departmentId')) {
                    $validator->errors()->add('tenderProjectId', 'โครงการที่เลือกเป็นของหน่วยงานอื่น TOR ต้องอยู่หน่วยงานเดียวกับโครงการ');

                    return;
                }

                if ((int) $tenderProjectId !== $this->currentTenderProjectId()
                    && ! in_array($project->status, self::OPEN_PROJECT_STATUSES, true)) {
                    $validator->errors()->add('tenderProjectId', 'โครงการที่เลือกปิดหรือยกเลิกแล้ว ไม่สามารถเพิ่ม TOR ได้');
                }
            },
        ];
    }

    /**
     * The project the TOR is in before this request; a new TOR is in none.
     */
    protected function currentTenderProjectId(): ?int
    {
        return null;
    }
}
