<?php

namespace App\Modules\InternalProfiles\Infrastructure\Models;

use App\Modules\InternalProfiles\Infrastructure\Observers\PositionObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name'])]
#[ObservedBy([PositionObserver::class])]
class Position extends Model
{
    public function internalProfiles(): HasMany
    {
        return $this->hasMany(InternalProfiles::class);
    }
}
