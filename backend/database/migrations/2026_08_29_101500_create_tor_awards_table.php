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
        Schema::create('tor_awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tor_bid_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('contract_number')->unique();
            $table->date('contract_date');
            $table->decimal('contract_value', 14, 2);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->foreignId('signed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tor_awards');
    }
};
