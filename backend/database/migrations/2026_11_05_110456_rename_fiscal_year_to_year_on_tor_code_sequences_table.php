<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * TOR codes now number by the calendar year the TOR is created in rather
     * than its fiscal year. Existing counters are kept as they are, so no code
     * already issued for a year is handed out again.
     */
    public function up(): void
    {
        Schema::table('tor_code_sequences', function (Blueprint $table) {
            $table->renameColumn('fiscal_year', 'year'); // ปี ค.ศ. ที่สร้าง TOR
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tor_code_sequences', function (Blueprint $table) {
            $table->renameColumn('year', 'fiscal_year');
        });
    }
};
