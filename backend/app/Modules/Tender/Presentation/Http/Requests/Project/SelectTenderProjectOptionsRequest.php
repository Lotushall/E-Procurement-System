<?php

namespace App\Modules\Tender\Presentation\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class SelectTenderProjectOptionsRequest extends FormRequest
{
    /**
     * Both filters are optional: the TOR list filter asks for every project,
     * the TOR form asks only for those a TOR of the chosen department may join.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'open_for_tor' => ['nullable', 'boolean'],
        ];
    }
}
