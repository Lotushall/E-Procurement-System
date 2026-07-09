<?php

namespace App\Modules\Test\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
// use App\Modules\Test\Database\Factories\TestFactory;

class test extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [];

    // protected static function newFactory(): TestFactory
    // {
    //     // return TestFactory::new();
    // }
}
