<?php

namespace App\Modules\Auth\Application\DTOs;

use App\Modules\Auth\Presentation\Http\Requests\RegisterRequest;

final class RegisterVendorData
{
    // public function __construct(
    //     public readonly string $vendorType,
    //     public readonly ?string $companyName,
    //     public readonly ?string $taxId,
    //     public readonly ?string $fullName,
    //     public readonly ?string $idCard,
    //     public readonly string $phone,
    //     public readonly string $username,
    //     public readonly string $email,
    //     public readonly string $password,
    // ) {}

    // public static function fromRequest(RegisterRequest $request): self
    // {
    //     return new self(
    //         vendorType: $request->string('vendorType')->toString(),
    //         companyName: $request->string('companyName')->toString() ?: null,
    //         taxId: $request->string('taxId')->toString() ?: null,
    //         fullName: $request->string('fullName')->toString() ?: null,
    //         idCard: $request->string('idCard')->toString() ?: null,
    //         phone: $request->string('phone')->toString(),
    //         username: $request->string('username')->toString(),
    //         email: $request->string('email')->toString(),
    //         password: $request->string('password')->toString(),
    //     );
    // }

    // public function isCompany(): bool
    // {
    //     return $this->vendorType === 'company';
    // }
}
