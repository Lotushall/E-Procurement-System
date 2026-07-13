# Login / Logout (Auth module)

Date: 2026-07-13
Status: Approved

## บริบท / ปัญหา

`Auth` module มี route `register`, `email/verify`, `email/resend` ใช้งานได้จริงแล้ว แต่
`login`/`logout` ยังไม่สมบูรณ์:

- `AuthController::Login(LoginRequest $request) {}` และ `ResetPassword(...)` เป็น stub ว่างเปล่า
  (PascalCase method name ด้วย ไม่ตรง convention ของ method อื่นในไฟล์เดียวกัน เช่น
  `registerVendor`, `verifyEmail`)
- `app/Modules/Auth/Application/UseCases/LoginUseCase.php` มีบั๊ก copy-paste — เนื้อหาจริง
  ในไฟล์คือ `final class RegisterVendorUseCase {}` ว่างเปล่า ไม่ใช่ `LoginUseCase`
- `LoginData` (Spatie Data) เป็น class ว่างเปล่า ไม่มี property
- ไม่มี route สำหรับ `login`/`logout` เลยใน `routes/api/v1/auth.php`
- `UserRepositoryInterface` มีแค่ `findByEmail`, ไม่มี `findByUsername` — แต่ `LoginRequest`
  รองรับ login ด้วย username ได้อยู่แล้ว (`identifierField()` คืนค่า `'email'` หรือ
  `'username'` ตาม format ของ input)
- ระบบตั้งค่า Sanctum เป็น SPA session-cookie อยู่แล้ว: `bootstrap/app.php` เรียก
  `$middleware->statefulApi()`, `.env` มี `SANCTUM_STATEFUL_DOMAINS=localhost:3000`,
  `config/cors.php` มี `supports_credentials: true` — ไม่ใช่ token-based (Bearer) auth
- `User` domain entity มี `UserStatus` (Pending/Active/Suspended/Inactive, จาก
  `spatie/laravel-model-states`) และ `isVerified()` (เช็คจาก `emailVerifiedAt`) แต่ยังไม่มี
  โค้ดส่วนไหนอ้างอิงถึงเลย — รวมถึงไม่มีโค้ดไหน transition status จาก `Pending` ไป `Active`
  (คนละ flow กับ vendor document approval ซึ่งยังไม่ implement)

## เป้าหมาย

1. Implement `POST /api/v1/auth/login` — ตรวจสอบ credential (email หรือ username +
   password), สร้าง session-cookie ผ่าน Sanctum SPA guard (`web`)
2. Implement `POST /api/v1/auth/logout` — ทำลาย session ปัจจุบัน, ต้อง authenticate ก่อน
   ถึงจะเรียกได้
3. เพิ่ม `findByUsername` ใน `UserRepositoryInterface`/`UserRepository`
4. เพิ่ม business rule การ block login: ยังไม่ verify email, หรือ status เป็น
   `Suspended`/`Inactive`
5. เขียน Pest feature test ครอบคลุม login/logout ทั้ง success และ failure case

## Non-goals

- ไม่ implement `ResetPassword` (stub เดิมปล่อยไว้ตามเดิม ไม่อยู่ใน scope งานนี้)
- ไม่ block login ตอน status เป็น `Pending` (แม้ verify email แล้ว) เพราะไม่มี flow ไหนใน
  โค้ดตอนนี้ที่ transition status เป็น `Active` ได้ — ถ้า block ด้วยจะไม่มีใคร login ผ่านเลย
- ไม่ทำ token-based (Bearer/Personal Access Token) authentication — ใช้ session-cookie
  ตาม infra ที่ตั้งไว้แล้วเท่านั้น
- ไม่ทำ custom rate-limiter (เช่น per-email lockout) — ใช้ `throttle` middleware แบบเดียวกับ
  ที่ `email/resend` ใช้อยู่แล้ว (per-IP/route)
- ไม่ทำ "logout จากทุกอุปกรณ์" (revoke ทุก session/token ของ user) — logout เฉพาะ session
  ปัจจุบันเท่านั้น

## Design

### 1. `UserRepositoryInterface` / `UserRepository`

เพิ่ม method `findByUsername(string $username): ?User` (pattern เดียวกับ `findByEmail`
ที่มีอยู่แล้ว):

```php
// UserRepositoryInterface
public function findByUsername(string $username): ?User;

// UserRepository
public function findByUsername(string $username): ?User
{
    $model = UserModel::where('username', $username)->first();

    return $model !== null ? $this->toDomain($model) : null;
}
```

### 2. `LoginData` DTO

แก้ `app/Modules/Auth/Application/DTOs/LoginData.php` จาก class ว่างให้มี property:

```php
final class LoginData extends Data
{
    public function __construct(
        public readonly string $identifier,
        public readonly string $identifierField,
        public readonly string $password,
        public readonly bool $remember,
    ) {}
}
```

`identifierField` ไม่ได้มาจาก `$request->validated()` ตรงๆ (เป็น method บน
`LoginRequest`) — Controller ต้อง merge เข้าไปตอนสร้าง DTO (ดูข้อ 5)

### 3. `LoginUseCase`

เขียนทับไฟล์ที่มีบั๊ก copy-paste ให้เป็น class ใหม่จริงๆ:

```php
final class LoginUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function execute(LoginData $data): User
    {
        $user = $data->identifierField === 'email'
            ? $this->users->findByEmail($data->identifier)
            : $this->users->findByUsername($data->identifier);

        if ($user === null || ! Hash::check($data->password, $user->passwordHash())) {
            throw ValidationException::withMessages([
                'identifier' => 'These credentials do not match our records.',
            ]);
        }

        if (! $user->isVerified()) {
            throw ValidationException::withMessages([
                'identifier' => 'Please verify your email before logging in.',
            ]);
        }

        if ($user->status() instanceof Suspended) {
            throw ValidationException::withMessages([
                'identifier' => 'Your account has been suspended.',
            ]);
        }

        if ($user->status() instanceof Inactive) {
            throw ValidationException::withMessages([
                'identifier' => 'Your account is inactive.',
            ]);
        }

        return $user;
    }
}
```

หมายเหตุ: รวม error "user ไม่เจอ" กับ "password ผิด" เป็นข้อความเดียวกันโดยตั้งใจ (ไม่บอกว่า
identifier หรือ password ผิดจุดไหน) เพื่อไม่ให้เดา username/email ที่มีอยู่จริงในระบบได้
ส่วน "ยังไม่ verify" / "suspended" / "inactive" แยกข้อความเพราะ user ผ่านการยืนยันตัวตน
(รู้ password ถูกแล้ว) จึงไม่มีประเด็น enumeration

`ValidationException` เป็น class ของ Laravel เอง — ไม่ต้อง catch ใน Controller เพราะ
`bootstrap/app.php` ตั้ง `shouldRenderJsonWhen` ให้ route `api/*` แปลง exception เป็น JSON
422 ให้อัตโนมัติอยู่แล้ว (`{ message, errors: { identifier: [...] } }`)

### 4. `LogoutUseCase` (ใหม่)

```php
final class LogoutUseCase
{
    public function execute(): void
    {
        Auth::guard('web')->logout();
        Session::invalidate();
        Session::regenerateToken();
    }
}
```

ไม่มี dependency กับ Repository — ใช้ Facade ตรงๆ (สอดคล้องกับ `RegisterVendorUseCase`
ที่ใช้ `Hash`/`DB` facade อยู่แล้วในโค้ดเดิม)

### 5. `AuthController`

```php
public function __construct(
    private readonly RegisterVendorUseCase $registerVendor,
    private readonly LoginUseCase $login,
    private readonly LogoutUseCase $logout,
    private readonly VerifyEmailUseCase $verifyEmail,
    private readonly ResendVerificationEmailUseCase $resendVerificationEmail,
) {}

public function login(LoginRequest $request): JsonResponse
{
    $user = $this->login->execute(LoginData::from([
        ...$request->validated(),
        'identifierField' => $request->identifierField(),
        'remember' => $request->boolean('remember'),
    ]));

    Auth::guard('web')->loginUsingId($user->id(), remember: $request->boolean('remember'));
    $request->session()->regenerate();

    return response()->json([
        'message' => 'Login successful.',
        'data' => [
            'id' => $user->id(),
            'username' => $user->username(),
            'email' => (string) $user->email(),
            'userType' => $user->userType()->value,
        ],
    ]);
}

public function logout(): JsonResponse
{
    $this->logout->execute();

    return response()->json(['message' => 'Logout successful.']);
}
```

`Login`(PascalCase, stub เดิม) เปลี่ยนชื่อเป็น `login` (camelCase) ให้ตรง convention เดิม
ของไฟล์ (`registerVendor`, `verifyEmail`, `resendVerificationEmail`) — `ResetPassword`
ปล่อยไว้เหมือนเดิม (out of scope)

### 6. Routes (`routes/api/v1/auth.php`)

```php
Route::post('login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1')
    ->name('auth.login');

Route::post('logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum')
    ->name('auth.logout');
```

`throttle:5,1` (5 ครั้ง/นาที) เทียบเท่า pattern เดิมของ `email/resend`
(`throttle:3,1`) — ป้องกัน brute-force แบบง่าย ไม่ต้องสร้าง custom `RateLimiter`

### 7. Error response summary

| กรณี | HTTP status | Response |
|---|---|---|
| Login สำเร็จ | 200 | `{ message, data: {...} }` |
| Validation ผิด (`identifier`/`password` ว่าง) | 422 | Laravel FormRequest ปกติ |
| Credential ผิด / user ไม่เจอ | 422 | `errors.identifier` |
| ยังไม่ verify email | 422 | `errors.identifier` |
| Suspended / Inactive | 422 | `errors.identifier` |
| Logout สำเร็จ | 200 | `{ message }` |
| Logout ตอนไม่ได้ login | 401 | Laravel `auth:sanctum` default |

### 8. Testing

`tests/Feature/Modules/Auth/LoginTest.php`:
- login สำเร็จด้วย email → 200 + `Auth::check()` true
- login สำเร็จด้วย username → 200
- password ผิด → 422 `errors.identifier`
- identifier ไม่มีในระบบ → 422 `errors.identifier`
- ยังไม่ verify email → 422 พร้อมข้อความเฉพาะ
- status suspended → 422 พร้อมข้อความเฉพาะ
- status inactive → 422 พร้อมข้อความเฉพาะ
- `remember=true` → session/remember_token cookie ถูกตั้งค่า

`tests/Feature/Modules/Auth/LogoutTest.php`:
- logout ตอน authenticated → 200 + `Auth::check()` false หลังเรียก
- logout ตอนไม่ได้ authenticate → 401

ใช้ `UserFactory` ที่มีอยู่แล้ว (ต้องเช็คว่ามี state สำหรับตั้ง `email_verified_at` /
`status` ได้ครบทุกค่าที่ test ต้องการ ถ้าไม่มีต้องเพิ่ม factory state)
