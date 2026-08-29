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
        Schema::create('tor_evaluation_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tor_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('max_score', 5, 2);
            $table->decimal('weight', 5, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tor_evaluation_criteria');
    }
};
