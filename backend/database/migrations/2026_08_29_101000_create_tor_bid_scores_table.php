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
        Schema::create('tor_bid_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tor_bid_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tor_evaluation_criterion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('evaluator_id')->nullable()->constrained('internal_profiles')->nullOnDelete();
            $table->decimal('score', 5, 2);
            $table->text('remark')->nullable();
            $table->timestamps();

            $table->unique(['tor_bid_id', 'tor_evaluation_criterion_id', 'evaluator_id'], 'tor_bid_scores_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tor_bid_scores');
    }
};
