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
        Schema::create('tor_bid_documents', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->foreignId('tor_bid_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('document_type')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tor_bid_documents');
    }
};
