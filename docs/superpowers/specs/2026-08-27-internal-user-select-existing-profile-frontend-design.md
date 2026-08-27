# แก้ฟอร์มสร้าง internal user ให้เลือก Internal Profile ที่มีอยู่แล้ว (frontend)

Date: 2026-08-27

## บริบท

อ้างอิง `docs/superpowers/specs/2026-08-27-internal-user-select-existing-profile-design.md`
(backend, เขียนวันเดียวกัน) ซึ่งเปลี่ยน `POST /api/v1/dashboard/users` ให้รับ
`internalProfileId` (เลือก Internal Profile ที่มีอยู่แล้วและ `user_id IS NULL`)
แทนการรับข้อมูลพนักงาน 7 ฟิลด์ตรงๆ (`prefix`/`firstname`/`lastname`/
`employeeNo`/`departmentId`/`positionId`/`phone`) และเพิ่ม endpoint ใหม่
`GET /api/v1/dashboard/internal-profiles/select-available` สำหรับดึงรายชื่อ
พนักงานที่ยังไม่ผูกบัญชี login

spec นั้นระบุว่า frontend เป็นขอบเขตแยกต่างหาก — เอกสารนี้คือส่วน frontend นั้น

Backend กำลังถูก implement คู่ขนานกันคนละ session (ยังไม่เสร็จตอนเขียน spec
นี้) โค้ด frontend จึงจะอ้างอิง endpoint/field ตามที่ backend spec นิยามไว้
ล่วงหน้า ตามรูปแบบที่ `lib/user/management/api.ts` ใช้อยู่แล้วในโมดูลนี้
(หัวไฟล์มีคอมเมนต์ระบุว่าเป็น "designed-but-not-yet-implemented backend
contract")

หน้าแก้ไข user (edit) **ไม่ต้องแก้อะไร** — `UpdateInternalUserSchema` และฟอร์ม
แก้ไข user ไม่มีฟิลด์โปรไฟล์อยู่แล้วในปัจจุบัน ตรงกับเป้าหมายของ backend spec
ที่จะเอาฟิลด์โปรไฟล์ออกจาก `UpdateUserRequest` เช่นกัน (แก้ไขข้อมูลพนักงานทำ
ผ่านหน้า internal-employees เท่านั้น)

## ขอบเขต

เฉพาะฟอร์ม **สร้าง** internal user (`app/dashboard/users/create`)

## Design

### 1. Types & API — `lib/internal-profiles`

- เพิ่ม type `AvailableInternalProfile { id: number; name: string }` ใน
  `types.ts`
- เพิ่ม `fetchAvailableInternalProfiles(): Promise<AvailableInternalProfile[]>`
  ใน `api.ts` → `GET /api/v1/dashboard/internal-profiles/select-available`
- เพิ่ม `lib/internal-profiles/queries/useAvailableInternalProfiles.ts` —
  `useQuery` ธรรมดา (queryKey `["internal-profiles", "select-available"]`)
  เหมือน `useDepartmentOptions` ทุกประการ ไม่ต้องตั้ง `staleTime`/`gcTime`
  พิเศษ (เรื่อง "ไม่ cache" ใน backend spec หมายถึง backend-side caching
  ไม่เกี่ยวกับ React Query ฝั่งนี้)

### 2. Component ใหม่ — `components/internal-profile-select.tsx`

`InternalProfileSelect`: combobox ค้นหาได้ โครงเดียวกับ `DepartmentSelect`
(`components/department-select.tsx`) แต่เป็นฟิลด์ **required** — ไม่มี
ตัวเลือก "---"/`allOption`

- placeholder: "เลือกพนักงาน"
- search input placeholder: "ค้นหาพนักงาน"
- `ComboboxEmpty`: "ไม่พบพนักงานที่ว่าง"
- รับ `profiles: AvailableInternalProfile[]`, `value: string`,
  `onValueChange`, `ariaInvalid`, `className` — pattern การแปลง id↔label
  เดียวกับ `DepartmentSelect`

### 3. Schema & payload type ของฟอร์มสร้าง user

- `lib/user/management/types.ts` — `CreateUserPayload`: เอา
  `prefix`/`firstname`/`lastname`/`employeeNo`/`departmentId`/`positionId`/
  `phone` ออกทั้งหมด เพิ่ม `internalProfileId: number`
- `app/dashboard/users/_schemas/schema.ts` — `CreateUserSchema`: เอา 7
  ฟิลด์เดิมออก เพิ่ม `internalProfileId: z.string().min(1, "กรุณาเลือก
  พนักงาน")` (เก็บเป็น string ใน form values แบบเดียวกับ `departmentId`/
  `positionId` เดิม แล้วแปลงเป็น number ตอน submit)

### 4. Form hook — `_hooks/use-create-user-form.ts`

- `defaultValues`: เอา 7 ฟิลด์เดิมออก เพิ่ม `internalProfileId: ""`
- payload ตอน submit: `internalProfileId: Number(values.internalProfileId)`
  แทนการ map 7 ฟิลด์เดิม
- `getErrorMessage`/`toast.promise` ไม่ต้องแก้ — ดึง
  `error.response.data.errors` ตรงๆ อยู่แล้ว จะแสดงข้อความ validation จาก
  backend (เช่น error ของ `internalProfileId` เมื่อ id ไม่มีอยู่จริงหรือถูก
  ผูกไปแล้ว) ให้อัตโนมัติโดยไม่ต้องเพิ่มโค้ด

### 5. Form fields component — `_components/create-internal-user-fields.tsx`

- เอาออกทั้งหมด: `Input`/`Controller` ของ `prefix`/`firstname`/`lastname`/
  `employeeNo`/`phone`/`departmentId`/`positionId`, ค่าคงที่
  `PREFIX_OPTIONS`, import `DepartmentSelect`/`PositionSelect`/`Department`/
  `Position`
- เพิ่ม `Controller` เดียวสำหรับ `internalProfileId` ใช้
  `InternalProfileSelect`
- prop `departments`/`positions` เดิมของ component นี้เปลี่ยนเป็น
  `internalProfiles: AvailableInternalProfile[]`

### 6. Create page — `create/page.tsx`

- แทน `useDepartmentOptions`/`usePositionOptions` ด้วย
  `useAvailableInternalProfiles`
- ส่ง prop `internalProfiles` แทน `departments`/`positions` ให้
  `CreateInternalUserFields`

### 7. `lib/user/management/api.ts` header comment

- เพิ่มบรรทัดอ้างอิง spec นี้ (ทั้ง backend และ frontend) ต่อจากคอมเมนต์เดิม
  ที่อธิบายว่าเป็น contract ที่ยังไม่ implement จริง

## Empty state

ถ้าไม่มีพนักงานว่างเหลือให้เลือก (`AvailableInternalProfile[]` เป็น array
ว่าง) — `ComboboxEmpty` จะโชว์ "ไม่พบพนักงานที่ว่าง" เฉยๆ ผู้ใช้กด submit ไม่ได้
เพราะฟิลด์ required ไม่มีค่าให้เลือก ไม่ทำ banner/ข้อความช่วยเหลือเพิ่มเติม

## Testing

โปรเจกต์นี้ไม่มี automated test สำหรับ form hook กลุ่มนี้ (ยึดแนวทาง
tsc/lint/build + manual QA) — จะรัน `npx tsc --noEmit` และ `npm run lint`
ทวนหลังแก้เสร็จ และแจ้งผู้ใช้ว่าไม่มี browser automation ให้ QA จริงใน
สภาพแวดล้อมนี้ (ต้องให้ผู้ใช้ทดสอบเองในเบราว์เซอร์)

## Out of scope

- Backend implementation ของ spec หลัก (อีก session ทำคู่ขนานอยู่)
- แก้หน้า edit user — ไม่มีฟิลด์โปรไฟล์อยู่แล้ว ไม่ต้องแตะ
- Bulk/relink: เปลี่ยน internal profile ที่ผูกกับ user ที่มีอยู่แล้วไปเป็น
  คนละโปรไฟล์ (ไม่มีใน backend spec เช่นกัน)
