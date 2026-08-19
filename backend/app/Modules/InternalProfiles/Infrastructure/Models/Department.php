<?php

namespace App\Modules\InternalProfiles\Infrastructure\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name'])]
class Department extends Model
{
    public function internalProfiles(): HasMany
    {
        return $this->hasMany(InternalProfiles::class);
    }
}
