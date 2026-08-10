<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('model_has_roles')->where('model_type', User::class)->update(['model_type' => 'user']);
        DB::table('model_has_permissions')->where('model_type', User::class)->update(['model_type' => 'user']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('model_has_roles')->where('model_type', 'user')->update(['model_type' => User::class]);
        DB::table('model_has_permissions')->where('model_type', 'user')->update(['model_type' => User::class]);
    }
};
