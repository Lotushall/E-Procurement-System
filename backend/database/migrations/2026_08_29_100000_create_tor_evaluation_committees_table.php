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
        Schema::create('tor_evaluation_committees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('internal_profile_id')->nullable()->constrained('internal_profiles')->nullOnDelete();
            $table->enum('role', ['chairman', 'secretary', 'member'])->default('member');
            $table->timestamps();

            $table->unique(['tor_id', 'internal_profile_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tor_evaluation_committees');
    }
};
