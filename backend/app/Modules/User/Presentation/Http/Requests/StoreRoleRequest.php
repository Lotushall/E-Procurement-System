<?php

namespace App\Modules\User\Presentation\Http\Requests;

use App\Modules\User\Domain\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('roles', 'name'),
            ],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(Permission::values())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'ใช้ได้แค่ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)',
            'name.unique' => 'มี role ชื่อนี้อยู่แล้ว',
        ];
    }
}
