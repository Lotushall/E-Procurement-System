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
        Schema::create('tors', function (Blueprint $table) {
            $table->id();
            $table->string('tor_code')->unique();
            $table->string('title');
            $table->text('scope_of_work');
            $table->foreignId('department_id')->constrained()->restrictOnDelete();
            $table->foreignId('tender_project_id')->nullable()->constrained('tenders_projects')->nullOnDelete();
            $table->decimal('budget_estimate', 14, 2);
            $table->string('procurement_method');
            $table->unsignedSmallInteger('fiscal_year'); // ปีงบประมาณ
            $table->timestamp('bidding_start_at')->nullable();
            $table->timestamp('bidding_end_at')->nullable();
            $table->enum('status', [
                'draft',
                'in_review',
                'revision_required',
                'approved',
                'bidding',
                'closed',
                'no_bidder',
                'awarded',
                'completed',
                'cancelled',
            ])->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('remark')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tors');
    }
};
