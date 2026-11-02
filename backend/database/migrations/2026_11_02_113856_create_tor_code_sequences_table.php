<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The last TOR code sequence issued per fiscal year. Kept apart from the
     * tors table so a deleted TOR's code is never issued again.
     */
    public function up(): void
    {
        Schema::create('tor_code_sequences', function (Blueprint $table) {
            $table->unsignedSmallInteger('fiscal_year')->primary(); // ปีงบประมาณ
            $table->unsignedInteger('last_sequence');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tor_code_sequences');
    }
};
