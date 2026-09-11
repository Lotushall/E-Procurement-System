# Tender Project Status Change Design

## Goal

ให้ผู้ใช้ที่มีสิทธิ์เปลี่ยนสถานะโครงการจัดซื้อจัดจ้างได้จากตาราง และจากหัวการ์ดในหน้า detail

## Scope

**Frontend เท่านั้น** — backend endpoint มีอยู่แล้วใน working tree (อีก session ทำไว้ ยังไม่ commit) รอบนี้ไม่แตะไฟล์ใน `backend/`

## Decisions

ตัดสินใจไว้ระหว่าง brainstorming:

1. **Select เปลี่ยนทันที ไม่มี dialog ยืนยัน** — ทุกสถานะ รวมถึง "ยกเลิก" และ "เก็บถาวร" ตรงกับ `UserStatusSelect` ของหน้า users
2. **ใช้ได้ 2 ที่** — คอลัมน์สถานะในตาราง และหัวการ์ดในหน้า detail ใช้คอมโพเนนต์ตัวเดียวกัน
3. **แชร์ชื่อ/สีสถานะระหว่าง badge กับ select** — export ค่าคงที่จาก `tender-project-status-badge.tsx` แทนการคัดลอก

## API contract (มีอยู่แล้วฝั่ง backend)

```
PATCH /api/v1/dashboard/tender-projects/{id}/status
middleware: can:tender-projects.updateStatus
```

Request:

```json
{ "status": "draft" | "published" | "closed" | "completed" | "cancelled" | "archived" }
```

Responses:

- `200` — `{ "data": TenderProjectResource }`
- `422` — `{ "message": "ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากโครงการอยู่ในสถานะนี้อยู่แล้ว" }` เมื่อเปลี่ยนเป็นสถานะเดิม
- `422` — validation error เมื่อ `status` ไม่อยู่ในรายการ
- `403` — ไม่มีสิทธิ์ (Laravel ส่ง message ภาษาอังกฤษ)

Backend อนุญาตให้เปลี่ยนจากสถานะใดไปสถานะใดก็ได้ ห้ามแค่สถานะเดิม

## Permission

- Gate ฝั่ง route: `tender-projects.updateStatus` (ขีดกลาง)
- ชื่อ permission ใน DB (`AdminUserSeeder`): `tender_projects.updateStatus` (ขีดล่าง) — policy จับคู่ให้
- `user.permissions` ที่ frontend ได้รับเป็นชื่อใน DB ดังนั้น frontend เช็คด้วย **`tender_projects.updateStatus`**
- มีสิทธิ์ → เห็น `TenderProjectStatusSelect` / ไม่มีสิทธิ์ → เห็น `TenderProjectStatusBadge` เหมือนเดิม

## Data layer

### `lib/tender/tender-projects/api.ts`

```ts
export async function updateTenderProjectStatus(
  id: number,
  status: TenderProjectStatus,
): Promise<TenderProjectStatus>
```

`api.patch<{ data: TenderProjects }>` ไปที่ `/api/v1/dashboard/tender-projects/${id}/status` ด้วย body `{ status }` คืน `data.data.status`

### `lib/tender/tender-projects/mutations/useUpdateTenderProjectStatus.ts`

`useUpdateTenderProjectStatus(id: number)` — `mutationFn: (status) => updateTenderProjectStatus(id, status)` และ `onSettled` invalidate `["tenders_projects"]`

key นี้ครอบ list, detail (`["tenders_projects", "detail", id]`) และการ์ดสถิติ (stats มากับ `meta.stats` ของ list response) ทั้งหมดจึงอัปเดตพร้อมกันหลังเปลี่ยนสถานะ

## Components

### `components/tender-project-status-badge.tsx` (แก้)

export 2 ค่าที่เคยอยู่ภายในไฟล์:

- `TENDER_PROJECT_STATUS_STYLE: Record<TenderProjectStatus, { label; badge; dot }>` — เปลี่ยนชื่อจาก `STATUS_STYLE` และ type key ให้แคบลงจาก `string`
- `TENDER_PROJECT_STATUSES: TenderProjectStatus[]` — ลำดับที่แสดงใน select: draft, published, closed, completed, cancelled, archived

พฤติกรรมของ badge เดิมต้องไม่เปลี่ยน รวมถึง `status: string` prop และการคืน `null` เมื่อไม่รู้จักสถานะ

### `components/tender-project-status-select.tsx` (ใหม่)

Props: `{ id: number; status: TenderProjectStatus }`

โครงเดียวกับ `components/user-status-select.tsx`:

- `Select` ที่ trigger หน้าตาเป็น badge (`rounded-full border-0 tracking-wider` + สีจาก style map) มีจุดสีนำหน้า
- ระหว่าง mutation pending แสดง `Loader2Icon` หมุนแทนจุดสี
- เลือกค่าเดิม หรือกดซ้ำระหว่าง pending → ไม่ทำอะไร
- `toast.promise`: loading `"กำลังเปลี่ยนสถานะ..."` / success `"เปลี่ยนสถานะสำเร็จ"` / error ตามด้านล่าง

**Error message:** ใช้ `message` จาก response **เฉพาะ status 422** (backend เป็นภาษาไทย) กรณีอื่นทั้งหมดใช้ `"เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"` — ต่างจาก `UserStatusSelect` ที่ใช้ `message` ทุกกรณี เพราะ 403 ของ Laravel เป็นภาษาอังกฤษ

## Wiring

### ตาราง — `app/dashboard/tender-projects/page.tsx` + `columns.tsx`

- `page.tsx`: `const { hasPermission } = useAuthPermissions()` → `const canUpdateStatus = hasPermission("tender_projects.updateStatus")` → `createColumns(canUpdateStatus)` และใส่ `canUpdateStatus` ใน deps ของ `useMemo`
- `columns.tsx`: `createColumns(canUpdateStatus: boolean)` คอลัมน์ `status` render `TenderProjectStatusSelect` (พร้อม `key={row.original.id}`) เมื่อมีสิทธิ์ ไม่งั้น `TenderProjectStatusBadge` เหมือนเดิม

`key={row.original.id}` ใส่ด้วยเหตุผลเดียวกับ edit dialog — `DataTable` ไม่ได้ตั้ง `getRowId` แถวจึงผูกกับ index ถ้าแถวสลับตำแหน่งหลัง refetch ต้อง remount ไม่ให้ mutation ของโครงการหนึ่งค้างอยู่ในแถวของอีกโครงการ

### หน้า detail — `app/dashboard/tender-projects/detail/page.tsx`

แทน `<TenderProjectStatusBadge status={project.status} />` ที่หัวการ์ดด้วยเงื่อนไขเดียวกัน

ไฟล์นี้มีงานของผู้ใช้ที่แก้ค้างไว้ยังไม่ stage — แก้เฉพาะ import, บรรทัดดึงสิทธิ์ และจุด badge เท่านั้น ห้ามแตะส่วนอื่น

`useAuthPermissions()` ต้องเรียกก่อน early return ของ loading/not-found เพื่อไม่ละเมิด rules of hooks

## Testing

frontend ไม่มี test runner และเครื่อง dev ไม่มี browser automation

- `npx tsc --noEmit` — **ต้องไม่มี error ใหม่** นอกจาก 2 จุดเดิมที่ห้ามแก้ (`app/(auth)/register/page.tsx:129`, `app/dashboard/internal-employees/departments-positions/page.tsx:18`)
- `npx eslint <ไฟล์ที่แตะ>` — ต้องสะอาด
- ไม่ใช้ "`next build` ต้องผ่าน" เป็น gate เพราะ error เดิม 2 จุดทำให้ build ไม่ผ่านอยู่แล้ว

**Manual QA:**

1. ผู้ใช้ที่มี `tender_projects.updateStatus` เห็น select ในตารางและหัวการ์ดหน้า detail ส่วนผู้ใช้ที่ไม่มีเห็น badge
2. เปลี่ยนสถานะในตาราง → toast สำเร็จ, สีและชื่อสถานะเปลี่ยน, การ์ดสถิติ "กำลังดำเนินการ"/"เสร็จสิ้น" อัปเดต
3. เปลี่ยนในหน้า detail → กลับไปหน้าตารางแล้วเห็นสถานะใหม่
4. เลือกสถานะเดิมซ้ำ → ไม่มี request และไม่มี toast
5. ถ้ามี filter สถานะอยู่ แล้วเปลี่ยนสถานะออกจาก filter → แถวหายจากตารางหลัง refetch (พฤติกรรมที่ถูกต้อง)

## Out of scope

- Dialog ยืนยันก่อนเปลี่ยนสถานะ
- กฎ state machine ว่าสถานะไหนไปไหนได้ (backend อนุญาตทุกทาง)
- การ gate ปุ่มดู/แก้ไข/ลบด้วย permission
- ทุกอย่างใน `backend/`
