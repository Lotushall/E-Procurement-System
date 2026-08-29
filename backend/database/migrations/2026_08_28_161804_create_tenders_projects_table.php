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
        Schema::create('tenders_projects', function (Blueprint $table) {
            $table->id();
            $table->string('project_code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('budget', 14, 2);
            $table->foreignId('department_id')->constrained()->restrictOnDelete();
            $table->foreignId('person_in_charge_id')->nullable()->constrained('internal_profiles')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('procurement_method');
            $table->unsignedSmallInteger('fiscal_year'); // ปีงบประมาณ
            $table->timestamp('project_start_at')->nullable();
            $table->timestamp('project_end_at')->nullable();
            $table->enum('status', ['draft', 'published', 'closed', 'completed', 'cancelled', 'archived'])->default('draft');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenders_projects');
    }
};
