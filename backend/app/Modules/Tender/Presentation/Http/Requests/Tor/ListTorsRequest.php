<?php

namespace App\Modules\Tender\Presentation\Http\Requests\Tor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Fluent;
use Illuminate\Validation\Rule;

class ListTorsRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::in([
                'draft',
                'in_review',
                'revision_required',
                'approved',
                'bidding',
                'closed',
                'no_bidder',
                'awarded',
                'completed',
                'cancelled',
            ])],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'fiscal_year' => ['nullable', 'integer'],
            'tender_project_id' => [
                'nullable',
                Rule::when(
                    fn (Fluent $input) => $input->get('tender_project_id') !== 'none',
                    ['integer', 'exists:tenders_projects,id'],
                ),
            ],
            'procurement_method' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'string', Rule::in(['tor_code', 'title', 'budget_estimate', 'fiscal_year', 'bidding_end_at', 'created_at'])],
            'sort_direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
