# Tender Project Edit Dialog Design

## Goal

แทนปุ่ม "แก้ไข" ที่ยัง disabled อยู่ในตารางโครงการจัดซื้อจัดจ้าง ด้วย dialog ที่แก้ไขข้อมูลโครงการได้จริง โดยใช้ฟิลด์ชุดเดียวกับตอนสร้างโครงการ

## Scope

**Frontend เท่านั้น** — backend endpoint สำหรับ update ยังไม่มี รอบนี้วาง API contract ไว้ให้ฝั่ง Laravel มาทำต่อใน plan แยก

## Background

ตอนนี้ `routes/api/v1/dashboard/tender-projects.php` มีแค่ 4 endpoint:

| Method | Path | Middleware |
|---|---|---|
| GET | `/` | `can:tender-projects.index` |
| GET | `/{id}` | `can:tender-projects.index` |
| POST | `/` | `can:tender-projects.store` |
| DELETE | `/{id}` | `can:tender-projects.destroy` |

ฝั่ง frontend `lib/tender/tender-projects/` จึงมีแค่ `useCreateTenderProject` กับ `useDeleteTenderProject` ยังไม่มี update

ปุ่มแก้ไขใน `app/dashboard/tender-projects/_components/table/columns.tsx:118` เป็น `<DisabledActionButton icon={Pencil} label="แก้ไข" />` ซึ่งเป็น placeholder

สิ่งที่มีอยู่แล้วและ edit ใช้ฟิลด์ชุดเดียวกันเป๊ะ คือ `CreateTenderProjectDialog` (ชื่อโครงการ, แผนก, ผู้รับผิดชอบ, งบประมาณ, วิธีจัดซื้อ, ปีงบประมาณ, ระยะเวลา, รายละเอียด)

## Decisions

ตัดสินใจไว้ 3 ข้อระหว่าง brainstorming:

1. **ขอบเขต: frontend อย่างเดียว** — ตามธรรมเนียมของโปรเจกต์ที่แยก plan ฝั่ง backend/frontend ออกจากกัน
2. **โครงสร้างฟอร์ม: คัดลอกแยกไฟล์** — ไม่ extract shared component ไม่แตะ `create-tender-project-dialog.tsx` เลย แลกกับ duplication เพื่อความเสี่ยง regression เป็นศูนย์
3. **สถานะที่แก้ไขได้: ทุกสถานะ** — ปุ่มแก้ไขกดได้เสมอ ไม่มีการ gate ตาม `status`

## API contract (สำหรับ backend plan รอบถัดไป)

```
PUT /api/v1/dashboard/tender-projects/{id}
middleware: can:tender-projects.update
```

Request body — เหมือน `store` ทุกฟิลด์ (full replace ไม่ใช่ partial):

```jsonc
{
  "name": "string",
  "description": "string | undefined",
  "budget": 186000000,
  "departmentId": 1,
  "personInChargeId": 3,        // optional
  "procurementMethod": "string",
  "fiscalYear": 2569,
  "projectStartAt": "2026-04-01", // optional
  "projectEndAt": "2026-12-31"    // optional
}
```

Response — mirror `store`:

```jsonc
{ "data": { "projectCode": "TP-2569-0001" } }
```

เลือก `PUT` + ส่งครบทุกฟิลด์ เพราะ dialog เปิดมาพร้อมค่าเดิมทั้งหมด ไม่มีเคส partial update และการ mirror `store` ทำให้ฝั่ง Laravel reuse validation rule ได้เกือบทั้งหมด

## Data layer

### `lib/tender/tender-projects/types.ts`

เพิ่ม `UpdateTenderProjectPayload` — โครงเดียวกับ `CreateTenderProjectPayload`

### `lib/tender/tender-projects/api.ts`

```ts
export async function updateTenderProject(
  id: number,
  payload: UpdateTenderProjectPayload,
): Promise<{ projectCode: string }>
```

เรียก `api.put<{ data: { projectCode: string } }>` ไปที่ `/api/v1/dashboard/tender-projects/${id}` คืน `data.data`

### `lib/tender/tender-projects/mutations/useUpdateTenderProject.ts`

`useMutation` รับ `{ id, payload }` แล้ว `onSettled` invalidate `["tenders_projects"]`

key เดียวครอบทั้ง list และ detail เพราะ detail query ใช้ `["tenders_projects", "detail", id]` ซึ่งมี prefix เดียวกัน — pattern เดียวกับ `useDeleteTenderProject`

## Form schema + hook

### `app/dashboard/tender-projects/_schemas/schema.ts`

เพิ่ม `UpdateTenderProjectSchema` เป็นสำเนาของ `CreateTenderProjectSchema` (ค่าทุกตัวเป็น `string` แล้วแปลงเป็น number ตอน submit) พร้อม `UpdateTenderProjectFormValues`

### `app/dashboard/tender-projects/_hooks/use-edit-tender-project-form.ts`

รับ `project: TenderProjects` กับ `onSubmitted: () => void`

**การ normalize ค่าตั้งต้น** — shape ที่ API ส่งมาไม่ตรงกับที่ฟอร์มต้องการ 5 จุด:

| ฟิลด์ | API ส่งมา | ฟอร์มต้องการ | วิธีแปลง |
|---|---|---|---|
| `budget` | `"186000000.00"` / `"500000.50"` | `"186000000"` / `"500000.50"` | จำนวนเต็มใช้ `String(n)` มีสตางค์ใช้ `n.toFixed(2)` — ไม่งั้นช่องจะโชว์ `186,000,000.00` หรือทศนิยมหลักที่สองหาย (`500,000.5`) |
| `projectStartAt` / `projectEndAt` | ISO string เป็น UTC | `"yyyy-MM-dd"` ตาม local time | `format(new Date(v), "yyyy-MM-dd")` |
| `fiscalYear` | number เช่น `2569` | `"2569"` | `v != null ? String(v) : ""` |
| `department` | `{ id: 1, name }` หรือไม่มี | `"1"` หรือ `""` | `v?.id ? String(v.id) : ""` |
| `personInCharge` | object หรือไม่มี | `"3"` หรือ `""` | `v?.id ? String(v.id) : ""` |

**ห้ามใช้ `v.slice(0, 10)` กับวันที่** (แก้ตาม final review) — backend เก็บเวลาเป็น Asia/Bangkok แต่ serialize ออก JSON เป็น UTC โครงการที่เริ่ม 1 เม.ย. 2026 จะมาเป็น `"2026-03-31T17:00:00.000000Z"` การ slice จะได้วันตาม UTC ซึ่งช้าไป 1 วัน ต้องแปลงผ่าน `new Date()` ให้เป็นเวลาท้องถิ่นแบบเดียวกับคอลัมน์ "ระยะเวลา" ใน `columns.tsx`

**`fiscalYear` เป็น number** (แก้ตาม final review) — migration เป็น `unsignedSmallInteger` และ model cast เป็น `integer` จึงแก้ `TenderProjects.fiscalYear` ใน `types.ts` จาก `string` เป็น `number` ส่วนฟอร์มและ `Select` ยังใช้ string เหมือนเดิม ถ้าไม่แปลง `Select` จะเทียบ number กับ string ไม่ตรงกัน ช่องจะว่างตลอด

**คง `?.` ไว้ที่ `department` และ `personInCharge`** — `TenderProjectResource` ใช้ `whenLoaded()` ถ้าไม่ได้ eager-load key จะหายไปจาก JSON ทั้งก้อน และ `person_in_charge_id` เป็น nullable ดังนั้น type ใน `types.ts` ที่เคยประกาศว่า non-optional นั้นผิด ไม่ใช่โค้ด — แก้แล้วในรอบ follow-up: `description?`, `department?`, `personInCharge?: InternalProfile | null`, `createdBy?` และ `columns.tsx` อ่าน `department?.name ?? "-"`

แยกเป็นฟังก์ชัน `toFormValues(project)` เพื่อให้ใช้ซ้ำได้ทั้งตอน `defaultValues` และตอน `reset()`

**การ re-seed** — เรียก `reset(toFormValues(project))` ตอน `onOpenChange` ของ dialog ทั้งขาเปิดและขาปิด

ไม่ใช้ `useEffect` เฝ้า `project` เพราะ react-query สร้าง object ใหม่ทุกครั้งที่ refetch (เช่นตอนสลับ tab กลับมา) ซึ่งจะ reset ทับค่าที่ผู้ใช้กำลังพิมพ์ค้างไว้ การผูกกับจังหวะเปิด/ปิด dialog ให้ผลที่ต้องการ — เปิดมาเห็นค่าล่าสุดเสมอ — โดยไม่มีความเสี่ยงนั้น

## New component: `EditTenderProjectDialog`

`app/dashboard/tender-projects/_components/edit-tender-project-dialog.tsx`

Props:

```ts
{
  project: TenderProjects;
  trigger: ReactElement;
  triggerChildren: ReactNode;
}
```

ใช้ trigger pattern เดียวกับ `DeleteTenderProjectDialog` เพื่อให้ปุ่มใน `columns.tsx` หน้าตาเหมือนปุ่มอื่นในแถว

เนื้อฟอร์มคัดลอกจาก `CreateTenderProjectDialog` ทั้งหมด รวม helper ที่คัดลอกมาด้วย:

- `parseDateParam` / `DATE_PARAM_FORMAT`
- `sanitizeBudgetInput` / `formatBudgetDisplay` / `handleBudgetChange`
- `CURRENT_BUDDHIST_YEAR` / `FISCAL_YEAR_OPTIONS`

ต่างจาก create 4 จุด:

1. `DialogTitle` เป็น `"แก้ไขโครงการจัดซื้อจัดจ้าง"`
2. ปุ่ม submit เป็น `"บันทึกการแก้ไข"`
3. ไม่มี `DialogTrigger` เป็นปุ่มสีแดงในตัว — รับ `trigger` เข้ามาแทน
4. `onOpenChange` → `reset(toFormValues(project))` ทั้งขาเปิดและขาปิด กลับไปเป็นค่าเดิมของโครงการ ไม่ใช่ค่าว่างแบบ create

**ปีงบประมาณ:** `FISCAL_YEAR_OPTIONS` มีแค่ 5 ปีย้อนหลังจากปีปัจจุบัน ถ้าโครงการเก่ามี `fiscalYear` นอกช่วงนี้ `Select` จะแสดงค่าว่าง ผู้ใช้ต้องเลือกใหม่ก่อนบันทึก — ยอมรับพฤติกรรมนี้ในรอบนี้ (ดู Out of scope)

## Wiring — `columns.tsx`

แทน `<DisabledActionButton icon={Pencil} label="แก้ไข" />` ที่บรรทัด 118 ด้วย:

```tsx
<EditTenderProjectDialog
    key={row.original.id}
    project={row.original}
    trigger={
        <Button
            variant="outline"
            aria-label="แก้ไขโครงการ"
            className="size-8 px-1.5 pt-px rounded-md bg-white"
        />
    }
    triggerChildren={<Pencil className="w-4 h-4 text-gray-500" />}
/>
```

ใช้ `row.original` เป็นค่าตั้งต้นโดยตรง ไม่ fetch detail ใหม่ เพราะ list row มีครบทุกฟิลด์ที่ฟอร์มต้องใช้อยู่แล้ว — เปิด dialog แล้วกรอกได้ทันที ไม่มี loading state

`DisabledActionButton` ถูกใช้ใน `columns.tsx` แค่จุดเดียวคือปุ่มแก้ไข เมื่อแทนแล้วต้องลบ import ออกด้วย

ตัวคอมโพเนนต์ `components/disabled-action-button.tsx` จะไม่มีไฟล์ไหนใช้เลยหลังจากนี้ — **ไม่ลบ** เพราะเป็น placeholder กลางที่หน้าอื่นน่าจะหยิบไปใช้กับ action ที่ยังไม่พร้อม การลบอยู่นอกขอบเขต plan นี้

## Error handling

`toast.promise` แบบเดียวกับ create:

- loading: `"กำลังบันทึกการแก้ไข..."`
- success: `"บันทึกการแก้ไขสำเร็จ"` แล้วปิด dialog
- error: `getErrorMessage` อ่าน 422 field error ตัวแรก fallback `"บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"`

## Testing

frontend ยังไม่มี test framework และเครื่อง dev ไม่มี browser automation การตรวจสอบจึงเป็น:

- `npx tsc --noEmit` — ต้องไม่มี error ในไฟล์ที่แตะ (มี error เดิมค้างอยู่ 2 จุดที่ไม่เกี่ยวข้อง คือ `app/(auth)/register/page.tsx:129` และ `app/dashboard/internal-employees/departments-positions/page.tsx:18`)
- `npx eslint <ไฟล์ที่แตะ>` — ต้องสะอาด
- `npx next build` — ต้องผ่าน

**Manual QA ที่ต้องรบกวนผู้ใช้ตรวจ:**

1. เปิด dialog แล้วทุกช่องมีค่าเดิมของโครงการครบ — โดยเฉพาะงบประมาณต้องไม่มี `.00` ห้อยท้าย และ calendar ต้องไฮไลต์ช่วงวันที่ถูก
2. โครงการที่ไม่มี `personInCharge` หรือไม่มีวันที่ ต้องเปิดได้ไม่พัง
3. แก้ค่าแล้วปิด dialog โดยไม่บันทึก แล้วเปิดใหม่ ต้องเห็นค่าเดิม ไม่ใช่ค่าที่แก้ค้างไว้
4. validation ทำงาน (ชื่อว่าง, งบประมาณเกิน, วันสิ้นสุดก่อนวันเริ่ม)

**ข้อจำกัดที่ทดสอบไม่ได้ในรอบนี้:** จนกว่า backend จะทำ endpoint เสร็จ กดบันทึกจะได้ error toast (405 Method Not Allowed) เสมอ path ที่บันทึกสำเร็จและการ invalidate query จึงยังยืนยันไม่ได้

## Out of scope

- Backend endpoint, request validation, use case, repository, policy, tests — แยก plan
- Permission `tender-projects.update` ในตาราง permission และการ seed
- ปุ่มแก้ไขบนหน้า detail (`app/dashboard/tender-projects/detail/page.tsx`)
- หน้า edit แบบเต็มหน้าจอ — `routes.dashboards.tender_project.edit(id)` ใน `lib/routes.ts` ยังไม่มีหน้ารองรับ รอบนี้ไม่แตะและไม่ลบ
- ขยาย `FISCAL_YEAR_OPTIONS` ให้ครอบคลุมปีงบประมาณเก่า
- Extract shared form component ระหว่าง create กับ edit
