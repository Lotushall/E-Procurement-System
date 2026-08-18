<?php

namespace App\Modules\User\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePermissionRequest extends FormRequest
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
                'regex:/^[a-z][a-z0-9_]*\.[a-z][a-zA-Z0-9_]*$/',
                Rule::unique('permissions', 'name'),
            ],
            'label' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'รูปแบบต้องเป็น prefix.action เช่น reports.export (prefix ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น ส่วน action อนุญาตตัวพิมพ์ใหญ่ได้ เช่น updateStatus)',
            'name.unique' => 'มี permission ชื่อนี้อยู่แล้ว',
        ];
    }
}
