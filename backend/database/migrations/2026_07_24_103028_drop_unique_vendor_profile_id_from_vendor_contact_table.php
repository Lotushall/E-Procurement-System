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
        Schema::table('vendor_contact', function (Blueprint $table) {
            $table->index('vendor_profile_id');
        });

        // Environments migrated before the unique constraint was dropped from
        // the original migration file still enforce it; fresh installs never
        // created it, so only drop it when present.
        if (Schema::hasIndex('vendor_contact', ['vendor_profile_id'], 'unique')) {
            Schema::table('vendor_contact', function (Blueprint $table) {
                $table->dropUnique(['vendor_profile_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendor_contact', function (Blueprint $table) {
            $table->dropIndex(['vendor_profile_id']);
        });
    }
};
