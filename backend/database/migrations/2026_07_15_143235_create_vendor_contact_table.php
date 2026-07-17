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
        Schema::create('vendor_contact', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_profile_id')->unique()->constrained('vendor_profiles')->cascadeOnDelete();
            $table->string('contact_name')->nullable();
            $table->string('contact_position')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('line_id')->nullable();
            $table->text('other_contact')->nullable();
            $table->boolean('is_main_contact');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendor_contact');
    }
};
