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
        Schema::create('tor_bids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vendor_profile_id')->constrained()->cascadeOnDelete();
            $table->decimal('price_offered', 14, 2);
            $table->enum('status', [
                'submitted',
                'withdrawn',
                'disqualified',
                'qualified',
                'winner',
                'lost',
            ])->default('submitted');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('remark')->nullable();
            $table->timestamps();

            $table->unique(['tor_id', 'vendor_profile_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tor_bids');
    }
};
