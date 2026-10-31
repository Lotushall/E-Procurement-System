<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tors', function (Blueprint $table) {
            $table->enum('status', [
                'draft',
                'in_review',
                'revision_required',
                'approved',
                'published',
                'bidding',
                'closed',
                'no_bidder',
                'awarded',
                'completed',
                'cancelled',
            ])->default('draft')->change();
        });
    }

    /**
     * Reverse the migrations. Refuses while any TOR is published: moving it
     * back to approved would hide it from vendors already preparing bids,
     * and re-running up() could not tell which TORs had been published.
     */
    public function down(): void
    {
        $publishedCount = DB::table('tors')->where('status', 'published')->count();

        if ($publishedCount > 0) {
            throw new RuntimeException("Cannot roll back: {$publishedCount} TOR(s) are published. Move them to another status first.");
        }

        Schema::table('tors', function (Blueprint $table) {
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
            ])->default('draft')->change();
        });
    }
};
