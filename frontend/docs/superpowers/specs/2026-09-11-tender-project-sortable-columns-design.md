# Tender Project Sortable Columns Design

## Goal

ให้ผู้ใช้กดหัวคอลัมน์ในตารางโครงการจัดซื้อจัดจ้างเพื่อเรียงข้อมูลได้ 3 คอลัมน์: **รหัสโครงการ**, **โครงการ / หน่วยงาน**, **งบประมาณ**

## Scope

**Frontend เท่านั้น** — รอบนี้ไม่แตะไฟล์ใน `backend/`

## Decisions

ตัดสินใจไว้ระหว่าง brainstorming:

1. **ใช้ snake_case ตาม convention ของตาราง users / vendors / internal-employees** — id ของคอลัมน์และค่า `sort_by` คือ `project_code`, `name`, `budget` ส่งตรงไป backend ไม่มีชั้นแปลงค่า
2. **"โครงการ / หน่วยงาน" เรียงตามชื่อโครงการ (`name`)** — การเรียงตามหน่วยงานต้องแก้ backend จึงไม่อยู่ในรอบนี้
3. **`TenderProjectSortBy` และ `SORT_BY_VALUES` เหลือเฉพาะค่าที่มีคอลัมน์รองรับ** — ค่า camelCase 11 ค่าเดิมส่วนใหญ่ backend ไม่รับ ถ้า URL มีค่าพวกนั้นจะได้ 422 หรือ TanStack หาคอลัมน์ไม่เจอ
4. **ขยาย `SortableHeader` ที่ใช้ร่วมกันแบบ additive** — เพิ่ม `align="right"` และ `className` โดยตารางอื่นต้องหน้าตาเหมือนเดิม

## API contract

```
GET /api/v1/dashboard/tender-projects?sort_by=<value>&sort_direction=asc|desc
```

- `ListTenderProjectsRequest`: `Rule::in(['project_code', 'created_at', 'name', 'budget', 'fiscal_year'])`
- Model scope: whitelist `['project_code', 'name', 'budget', 'fiscal_year']` ค่าอื่น fallback เป็น `created_at`
- ไม่ส่ง `sort_by` → backend เรียง `created_at desc`
- tie-break ด้วย `id` ทิศเดียวกัน

**หมายเหตุ:** `project_code` ในทั้งสองไฟล์เป็นงานของอีก session ที่ **ยังไม่ commit** ถ้า backend รันจากโค้ดที่ commit แล้ว การเรียงตามรหัสโครงการจะได้ 422 ส่วน `name` และ `budget` ใช้ได้ทั้งสองกรณี

## Data layer

### `lib/tender/tender-projects/types.ts`

```ts
export type TenderProjectSortBy = "project_code" | "name" | "budget";
```

ผู้ใช้ type นี้อื่น (`api.ts`, `queries/useTendersProjectList.ts`) แค่ส่งค่าต่อเป็น string ไม่ต้องแก้

### `app/dashboard/tender-projects/_hooks/use-tender-project-list-page.ts`

```ts
const SORT_BY_VALUES: TenderProjectSortBy[] = ["project_code", "name", "budget"];
```

`useListPageControls` ข้าม `sort_by` ที่ไม่อยู่ในรายการ ดังนั้น URL เก่า เช่น `?sort_by=projectCode` จะแสดงตารางแบบไม่เรียง (default ของ backend) โดยไม่ error

## Components

### `components/ui/data-table-sortable-header.tsx` (แก้, ใช้ร่วมกับ users / vendors / internal-employees)

Props ใหม่:

```ts
align?: "left" | "center" | "right"   // เดิม "left" | "center"
className?: string                     // ใหม่ ต่อท้าย class ของปุ่ม
```

- wrapper: `align === "center"` → `justify-center` (เดิม) / `align === "right"` → `justify-end` (ใหม่)
- ปุ่ม: `align === "right"` ใช้ `-mr-3` แทน `-ml-3` เพื่อชดเชย padding ของปุ่ม ghost ฝั่งขวา กรณี left / center ใช้ `-ml-3` เหมือนเดิม
- `className` รวมผ่าน `cn()` ซึ่งใช้ tailwind-merge ดังนั้น `text-sm` ทับ `text-[0.8rem]` ของ size `sm` ได้
- ผู้เรียกเดิมที่ไม่ส่ง `align="right"` และ `className` ต้องได้ class เหมือนเดิมทุกตัว

### `app/dashboard/tender-projects/_components/table/columns.tsx` (แก้)

- แยก class ของหัวคอลัมน์เป็นค่าคงที่ `HEADER_TEXT_CLASS = "text-sm font-bold text-gray-500"` ใช้ทั้งใน `ColumnHeader` และส่งเป็น `className` ให้ `SortableHeader` หัวที่เรียงได้กับหัวปกติจึงเป็นตัวหนาสีเทาเหมือนกัน
- คอลัมน์ที่เปลี่ยน:

| คอลัมน์ | id เดิม | id ใหม่ | header |
|---|---|---|---|
| รหัสโครงการ | `projectCode` | `project_code` | `SortableHeader` |
| โครงการ / หน่วยงาน | `name` | `name` | `SortableHeader` |
| งบประมาณ | `budget` | `budget` | `SortableHeader` + `align="right"` |

- คอลัมน์อื่นใช้ `ColumnHeader` เหมือนเดิม
- `accessorFn` และ `cell` ของทุกคอลัมน์ไม่เปลี่ยน

## Behavior

- คลิกหัวคอลัมน์ → `column.toggleSorting()` วนตาม default ของ TanStack: ทิศแรก → ทิศตรงข้าม → ยกเลิกการเรียง (ทิศแรกเป็น `asc` เมื่อค่าในแถวแรกเป็น string)
- ไอคอน: `ArrowUp` (asc) / `ArrowDown` (desc) / `ArrowUpDown` สีจาง (ไม่เรียง)
- `setSorting` เขียน `sort_by` / `sort_direction` ลง URL และ reset กลับหน้า 1 (กลไกเดิมใน `useListPageControls`)
- เรียงได้ทีละคอลัมน์ (`enableMultiSort: false` ใน `DataTable`)
- การเรียงอยู่ร่วมกับ search / filter ได้ และคงอยู่หลัง refresh เพราะอ่านจาก URL

## Testing

frontend ไม่มี test runner และเครื่อง dev ไม่มี browser automation

- `npx tsc --noEmit` — **ต้องไม่มี error ใหม่** นอกจาก 2 จุดเดิมที่ห้ามแก้ (`app/(auth)/register/page.tsx:129`, `app/dashboard/internal-employees/departments-positions/page.tsx:18`)
- `npx eslint <ไฟล์ที่แตะ>` — ต้องสะอาด
- ไม่ใช้ "`next build` ต้องผ่าน" เป็น gate

**Manual QA:**

1. กดหัว "รหัสโครงการ" → URL มี `sort_by=project_code&sort_direction=asc` ไอคอนเป็นลูกศรขึ้น แถวเรียงตามรหัส กดซ้ำเป็น `desc` กดครั้งที่สามพารามิเตอร์หายและตารางกลับเป็นเรียงล่าสุดก่อน
2. ทำแบบเดียวกันกับ "โครงการ / หน่วยงาน" (เรียงตามชื่อ) และ "งบประมาณ" (หัวชิดขวา)
3. อยู่หน้า 2 แล้วกดเรียง → กลับไปหน้า 1
4. ใส่ search / filter แล้วเรียง → ทั้งสองอย่างมีผลพร้อมกัน, refresh แล้วการเรียงยังอยู่
5. เปิด `?sort_by=projectCode` หรือ `?sort_by=status` → ตารางโหลดปกติ ไม่มีไอคอนเรียง ไม่มี error
6. หัวที่เรียงได้กับหัวปกติในตารางโครงการเป็นตัวหนาสีเทาขนาดเท่ากัน
7. หัวคอลัมน์ที่เรียงได้ในตาราง users, vendors, internal-employees หน้าตาและการทำงานเหมือนเดิม

## Out of scope

- เรียงตามหน่วยงาน, ผู้รับผิดชอบ, ระยะเวลา, สถานะ หรือปีงบประมาณ
- การ map ค่า camelCase เก่าใน URL ให้เป็นค่าใหม่
- ทุกอย่างใน `backend/`
