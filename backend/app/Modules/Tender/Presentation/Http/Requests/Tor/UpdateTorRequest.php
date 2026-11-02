<?php

namespace App\Modules\Tender\Presentation\Http\Requests\Tor;

use App\Modules\Tender\Infrastructure\Models\Tor\Tors;

/**
 * An update replaces every editable field, so it validates like a store,
 * except that a TOR may stay in a project that no longer takes new TORs.
 */
class UpdateTorRequest extends StoreTorRequest
{
    protected function currentTenderProjectId(): ?int
    {
        return Tors::whereKey($this->route('id'))->value('tender_project_id');
    }
}
