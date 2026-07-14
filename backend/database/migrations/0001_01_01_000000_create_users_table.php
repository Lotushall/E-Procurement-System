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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('user_type', ['internal', 'company', 'individual']);
            $table->enum('status', ['pending', 'active', 'suspended', 'inactive'])->default('pending');
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('internal_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('employee_no')->nullable();
            $table->string('prefix')->nullable();
            $table->string('firstname');
            $table->string('lastname');
            $table->string('department')->nullable();
            $table->string('position')->nullable();
            $table->string('phone')->nullable();
            $table->timestamps();
        });

        Schema::create('vendor_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->enum('verification_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remark')->nullable();
            $table->timestamps();
        });

        Schema::create('vendor_company_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_profile_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('company_name');
            $table->string('business_registration_no')->nullable()->unique();
            $table->text('tax_id');
            $table->string('tax_id_hash', 64)->unique();
            $table->string('branch_no')->nullable();
            $table->string('business_type')->nullable();
            $table->text('address')->nullable();
            $table->string('country')->nullable();
            $table->string('province')->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->string('contact_name')->nullable();
            $table->string('contact_position')->nullable();
            $table->string('contact_phone');
            $table->string('contact_email');
            $table->string('line_id')->nullable();
            $table->text('other_contact')->nullable();
            $table->timestamps();
        });

        Schema::create('vendor_individual_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_profile_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('store_name');
            $table->string('prefix')->nullable();
            $table->string('firstname');
            $table->string('lastname');
            $table->text('citizen_id');
            $table->string('citizen_id_hash', 64)->unique();
            $table->string('business_type')->nullable();
            $table->text('tax_id')->nullable();
            $table->string('tax_id_hash', 64)->nullable()->unique();
            $table->string('email')->nullable();
            $table->string('phone');
            $table->text('address')->nullable();
            $table->string('country')->nullable();
            $table->string('province')->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->string('contact_name')->nullable();
            $table->string('line_id')->nullable();
            $table->text('other_contact')->nullable();
            $table->timestamps();
        });

        Schema::create('vendor_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_profile_id')->constrained()->cascadeOnDelete();
            $table->string('document_type');
            $table->string('file_name');
            $table->string('file_path');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('remark')->nullable();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('vendor_documents');
        Schema::dropIfExists('vendor_individual_details');
        Schema::dropIfExists('vendor_company_details');
        Schema::dropIfExists('vendor_profiles');
        Schema::dropIfExists('internal_profiles');
        Schema::dropIfExists('users');
    }
};
