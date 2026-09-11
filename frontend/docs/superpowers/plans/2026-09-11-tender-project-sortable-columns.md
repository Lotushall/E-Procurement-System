# Tender Project Sortable Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ผู้ใช้กดหัวคอลัมน์ รหัสโครงการ / โครงการ / หน่วยงาน / งบประมาณ ในตารางโครงการจัดซื้อจัดจ้างเพื่อเรียงข้อมูลฝั่ง server

**Architecture:** ขยาย `SortableHeader` ที่ใช้ร่วมกันแบบ additive (`align="right"` + `className`) แล้วเปลี่ยน 3 คอลัมน์ในตารางโครงการให้ใช้ `SortableHeader` ด้วย id แบบ snake_case (`project_code`, `name`, `budget`) พร้อมหด `TenderProjectSortBy` และ `SORT_BY_VALUES` ให้เหลือเฉพาะ 3 ค่านี้ ส่วนการเขียน URL, reset หน้า และส่ง `sort_by` ไป backend ใช้กลไกเดิมของ `useListPageControls` / `useTenderProjectsList` ทั้งหมด

**Tech Stack:** Next.js (App Router, client components), TanStack Table (`manualSorting`), TanStack Query, Tailwind v4 + tailwind-merge (`cn`), lucide-react

Spec: [`docs/superpowers/specs/2026-09-11-tender-project-sortable-columns-design.md`](../specs/2026-09-11-tender-project-sortable-columns-design.md)

## Global Constraints

- **ขอบเขต frontend เท่านั้น** — ห้ามแตะไฟล์ใน `backend/`
- **ห้าม commit จนกว่าผู้ใช้จะอนุญาต** — เป็นคำสั่งยืนของผู้ใช้ ทุก task จบที่ `git add` ตามที่ระบุ ห้าม `git commit`
- **ห้าม `git add` ไฟล์ `app/dashboard/tender-projects/detail/page.tsx` และ `detail/_hooks/use-tender-project-detail-page.ts`** — มีงานของผู้ใช้ที่แก้ค้างไว้ยังไม่ stage
- **ค่า sort ใช้ snake_case ตรงตัว:** `"project_code"`, `"name"`, `"budget"` — ทั้ง id ของคอลัมน์, `TenderProjectSortBy` และ `SORT_BY_VALUES` ต้องเป็นชุดเดียวกันพอดี
- **class ของหัวคอลัมน์ในตารางโครงการ:** `"text-sm font-bold text-gray-500"` ในค่าคงที่ `HEADER_TEXT_CLASS`
- **`SortableHeader` ต้อง backward compatible** — ผู้เรียกเดิม (users, vendors, internal-employees) ที่ไม่ส่ง `align="right"` / `className` ต้องได้ class ชุดเดิมทุกตัว ห้ามแก้ไฟล์ columns ของตารางเหล่านั้น
- **ห้ามเปลี่ยน `accessorFn` / `cell` ของคอลัมน์ใดใน `columns.tsx`** และห้ามแตะคอลัมน์ `personInCharge`, `project_start_end_date`, `tor_count`, `status`, `actions`
- **ไม่มี test runner ในโปรเจกต์นี้** — gate คือ `npx tsc --noEmit` + `npx eslint <ไฟล์>` ห้ามเขียน test ห้ามติดตั้ง test framework
- **Gate ของ `tsc` คือ "ไม่มี error ใหม่"** — ผลที่ยอมรับได้มีแค่ 2 บรรทัดเดิมที่ห้ามแก้:
  - `app/(auth)/register/page.tsx(129,118): error TS2322`
  - `app/dashboard/internal-employees/departments-positions/page.tsx(18,40): error TS2322`
- **ห้ามใช้ `npx next build` เป็น gate** — build ไม่ผ่านอยู่แล้วเพราะ error เดิม 2 จุดข้างบน
- **Indentation / style ตามไฟล์เดิม:** `components/ui/data-table-sortable-header.tsx` 4 spaces ไม่มี semicolon / `app/dashboard/tender-projects/_components/table/columns.tsx` 4 spaces มี semicolon / `lib/**` และ `app/dashboard/tender-projects/_hooks/*.ts` 2 spaces มี semicolon — ห้าม reformat บรรทัดที่ไม่ได้แก้
- **สำหรับ controller ที่รันแบบ no-commit:** ทำ checkpoint tree ด้วย index ชั่วคราว (`GIT_INDEX_FILE`) แทน `git add -A` บน index จริง เพื่อไม่ stage ไฟล์ที่ไม่เกี่ยวข้อง

---

### Task 1: ขยาย `SortableHeader` ให้รองรับ `align="right"` และ `className`

**Files:**
- Modify: `components/ui/data-table-sortable-header.tsx` (ทั้งไฟล์ 38 บรรทัด)

**Interfaces:**
- Consumes: `Button` จาก `@/components/ui/button`, `cn` จาก `@/lib/utils` (มีอยู่แล้ว)
- Produces:
  ```ts
  SortableHeader<TData>(props: {
      column: Column<TData, unknown>
      label: string
      align?: "left" | "center" | "right"   // default "left"
      className?: string                     // ต่อท้าย class ของ <Button> ผ่าน cn()
  })
  ```

- [ ] **Step 1: ยืนยันผู้เรียกเดิมก่อนแก้**

Run: `git grep -n "SortableHeader" -- app components`
Expected: มีแค่ `components/ui/data-table-sortable-header.tsx` และ `app/dashboard/{users,vendors,internal-employees}/_components/table/columns.tsx` — ไม่มีผู้เรียกที่ส่ง `className` หรือ `align="right"`

- [ ] **Step 2: แทนเนื้อหาทั้งไฟล์ `components/ui/data-table-sortable-header.tsx`**

```tsx
"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SortableHeader<TData>({
    column,
    label,
    align = "left",
    className,
}: {
    column: Column<TData, unknown>
    label: string
    align?: "left" | "center" | "right"
    className?: string
}) {
    const sorted = column.getIsSorted()
    return (
        <div
            className={cn(
                "flex items-center",
                align === "center" && "justify-center",
                align === "right" && "justify-end",
            )}
        >
            <Button
                variant="ghost"
                size="sm"
                // ชดเชย padding ของปุ่ม ghost ฝั่งที่ชิดขอบ ให้ข้อความตรงกับ cell ด้านล่าง
                className={cn(align === "right" ? "-mr-3" : "-ml-3", "h-8", className)}
                onClick={() => column.toggleSorting()}
            >
                {label}
                {sorted === "asc" ? (
                    <ArrowUp className="ml-1.5 size-3.5" />
                ) : sorted === "desc" ? (
                    <ArrowDown className="ml-1.5 size-3.5" />
                ) : (
                    <ArrowUpDown className="ml-1.5 size-3.5 text-muted-foreground" />
                )}
            </Button>
        </div>
    )
}
```

ตรวจความ backward compatible ด้วยตา: เมื่อ `align` เป็น `"left"` หรือ `"center"` และไม่ส่ง `className` → wrapper ได้ `"flex items-center"` (+ `"justify-center"` เมื่อ center) และปุ่มได้ `"-ml-3 h-8"` เหมือนเดิมทุกตัว

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: มีแค่ 2 บรรทัดเดิมใน Global Constraints ไม่มี error ใหม่

- [ ] **Step 4: Lint**

Run: `npx eslint components/ui/data-table-sortable-header.tsx`
Expected: ไม่มี output (exit 0)

- [ ] **Step 5: Stage (ห้าม commit)**

```bash
git add components/ui/data-table-sortable-header.tsx
```

---

### Task 2: เปิดการเรียง 3 คอลัมน์ในตารางโครงการ

**Files:**
- Modify: `lib/tender/tender-projects/types.ts:5-16` (`TenderProjectSortBy`)
- Modify: `app/dashboard/tender-projects/_hooks/use-tender-project-list-page.ts:11-23` (`SORT_BY_VALUES`)
- Modify: `app/dashboard/tender-projects/_components/table/columns.tsx` (import บรรทัด 12, `ColumnHeader` บรรทัด 17-19, header ของคอลัมน์ `projectCode` / `name` / `budget` บรรทัด 24-25, 33, 55)

**Interfaces:**
- Consumes: `SortableHeader` จาก Task 1 — props `{ column, label, align?: "left" | "center" | "right", className?: string }`
- Consumes (มีอยู่แล้ว ไม่ต้องแก้): `useListPageControls({ sortByValues })` ข้าม `sort_by` ใน URL ที่ไม่อยู่ใน `sortByValues`; `setSorting` เขียน `sort_by = <column id>` ตรงตัวและ reset หน้า; `fetchTenderProjectsList(..., sort_by?: TenderProjectSortBy, sort_direction, ...)` ส่งค่าไป backend ตรงตัว
- Produces: `type TenderProjectSortBy = "project_code" | "name" | "budget"`

- [ ] **Step 1: หด `TenderProjectSortBy` ใน `lib/tender/tender-projects/types.ts`**

แทนบรรทัด 5-16:

```ts
export type TenderProjectSortBy =
  | "projectCode"
  | "name"
  | "budget"
  | "department"
  | "personInCharge"
  | "createdBy"
  | "procurementMethod"
  | "fiscalYear"
  | "projectStartAt"
  | "projectEndAt"
  | "status";
```

ด้วย:

```ts
export type TenderProjectSortBy = "project_code" | "name" | "budget";
```

- [ ] **Step 2: หด `SORT_BY_VALUES` ใน `app/dashboard/tender-projects/_hooks/use-tender-project-list-page.ts`**

แทนบรรทัด 11-23:

```ts
const SORT_BY_VALUES: TenderProjectSortBy[] = [
  "projectCode",
  "name",
  "budget",
  "department",
  "personInCharge",
  "createdBy",
  "procurementMethod",
  "fiscalYear",
  "projectStartAt",
  "projectEndAt",
  "status",
];
```

ด้วย:

```ts
// ต้องตรงกับ id ของคอลัมน์ที่ใช้ SortableHeader ใน columns.tsx
const SORT_BY_VALUES: TenderProjectSortBy[] = ["project_code", "name", "budget"];
```

- [ ] **Step 3: เพิ่ม import `SortableHeader` ใน `columns.tsx`**

แทนบรรทัด:

```tsx
import { Button } from "@/components/ui/button";
```

ด้วย:

```tsx
import { Button } from "@/components/ui/button";
import { SortableHeader } from "@/components/ui/data-table-sortable-header";
```

- [ ] **Step 4: แยก class ของหัวคอลัมน์เป็นค่าคงที่ใน `columns.tsx`**

แทน:

```tsx
function ColumnHeader({ label, align }: { label: string; align?: "left" | "center" | "right" }) {
    return <p className={`text-sm font-bold text-gray-500 ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}>{label}</p>;
}
```

ด้วย:

```tsx
const HEADER_TEXT_CLASS = "text-sm font-bold text-gray-500";

function ColumnHeader({ label, align }: { label: string; align?: "left" | "center" | "right" }) {
    return <p className={`${HEADER_TEXT_CLASS} ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}>{label}</p>;
}
```

- [ ] **Step 5: เปลี่ยนคอลัมน์รหัสโครงการใน `columns.tsx`**

แทน:

```tsx
            id: "projectCode",
            header: () => <ColumnHeader label="รหัสโครงการ" />,
```

ด้วย:

```tsx
            id: "project_code",
            header: ({ column }) => <SortableHeader column={column} label="รหัสโครงการ" className={HEADER_TEXT_CLASS} />,
```

- [ ] **Step 6: เปลี่ยนหัวคอลัมน์โครงการ / หน่วยงานใน `columns.tsx`**

แทน:

```tsx
            header: () => <ColumnHeader label="โครงการ / หน่วยงาน" />,
```

ด้วย:

```tsx
            header: ({ column }) => <SortableHeader column={column} label="โครงการ / หน่วยงาน" className={HEADER_TEXT_CLASS} />,
```

- [ ] **Step 7: เปลี่ยนหัวคอลัมน์งบประมาณใน `columns.tsx`**

แทน:

```tsx
            header: () => <ColumnHeader label="งบประมาณ" align="right" />,
```

ด้วย:

```tsx
            header: ({ column }) => <SortableHeader column={column} label="งบประมาณ" align="right" className={HEADER_TEXT_CLASS} />,
```

- [ ] **Step 8: ตรวจว่าไม่เหลือค่า sort แบบ camelCase และชุดค่าตรงกัน**

Run: `git grep -n -E "\"(projectCode|department|personInCharge|createdBy|procurementMethod|fiscalYear|projectStartAt|projectEndAt)\"" -- lib/tender/tender-projects/types.ts app/dashboard/tender-projects/_hooks/use-tender-project-list-page.ts app/dashboard/tender-projects/_components/table/columns.tsx`
Expected: ไม่มีผลลัพธ์ (จำกัดแค่ 3 ไฟล์นี้ เพราะ form ของ create/edit dialog ใช้ชื่อ field อย่าง `"fiscalYear"` ซึ่งไม่เกี่ยวกับการเรียง — ห้ามแตะ)

Run: `git grep -n -E "id: \"(project_code|name|budget)\"" -- app/dashboard/tender-projects/_components/table/columns.tsx`
Expected: 3 บรรทัดพอดี คือ `project_code`, `name`, `budget` — ตรงกับ `SORT_BY_VALUES` และ `TenderProjectSortBy`

- [ ] **Step 9: Type check**

Run: `npx tsc --noEmit`
Expected: มีแค่ 2 บรรทัดเดิมใน Global Constraints ไม่มี error ใหม่

- [ ] **Step 10: Lint**

Run: `npx eslint lib/tender/tender-projects/types.ts app/dashboard/tender-projects/_hooks/use-tender-project-list-page.ts app/dashboard/tender-projects/_components/table/columns.tsx`
Expected: ไม่มี output (exit 0)

- [ ] **Step 11: Stage (ห้าม commit)**

Run: `git diff --stat -- lib/tender/tender-projects/types.ts app/dashboard/tender-projects/_hooks/use-tender-project-list-page.ts app/dashboard/tender-projects/_components/table/columns.tsx`
Expected: มีเฉพาะการเปลี่ยนแปลงของ task นี้ (ถ้ามีการแก้อื่นที่ไม่ได้มาจาก task นี้ ให้หยุดและรายงาน — อาจเป็นงานของ session อื่น)

```bash
git add lib/tender/tender-projects/types.ts app/dashboard/tender-projects/_hooks/use-tender-project-list-page.ts app/dashboard/tender-projects/_components/table/columns.tsx
```

---

## Manual QA (หลังจบทุก task — ผู้ใช้ทดสอบเองใน browser)

1. กดหัว "รหัสโครงการ" → URL มี `sort_by=project_code&sort_direction=asc` ไอคอนเป็นลูกศรขึ้น แถวเรียงตามรหัส กดซ้ำเป็น `desc` กดครั้งที่สามพารามิเตอร์หายและตารางกลับเป็นเรียงล่าสุดก่อน
2. ทำแบบเดียวกันกับ "โครงการ / หน่วยงาน" (เรียงตามชื่อ) และ "งบประมาณ" (หัวชิดขวา)
3. อยู่หน้า 2 แล้วกดเรียง → กลับไปหน้า 1
4. ใส่ search / filter แล้วเรียง → ทั้งสองอย่างมีผลพร้อมกัน, refresh แล้วการเรียงยังอยู่
5. เปิด `?sort_by=projectCode` หรือ `?sort_by=status` → ตารางโหลดปกติ ไม่มีไอคอนเรียง ไม่มี error
6. หัวที่เรียงได้กับหัวปกติในตารางโครงการเป็นตัวหนาสีเทาขนาดเท่ากัน
7. หัวคอลัมน์ที่เรียงได้ในตาราง users, vendors, internal-employees หน้าตาและการทำงานเหมือนเดิม

**หมายเหตุ backend:** `project_code` ใน whitelist ของ `ListTenderProjectsRequest` และ model scope commit แล้วใน `d3ff007` ข้อ 1 จึงไม่ติด 422
