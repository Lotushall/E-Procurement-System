<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('internal_profiles', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('lastname')->constrained()->restrictOnDelete();
            $table->foreignId('position_id')->nullable()->after('department_id')->constrained()->restrictOnDelete();
            $table->dropColumn(['department', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('internal_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
            $table->dropConstrainedForeignId('position_id');
            $table->string('department')->nullable();
            $table->string('position')->nullable();
        });
    }
};
