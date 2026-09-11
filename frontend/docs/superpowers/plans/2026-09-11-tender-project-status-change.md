# Tender Project Status Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ผู้ใช้ที่มีสิทธิ์ `tender_projects.updateStatus` เปลี่ยนสถานะโครงการจัดซื้อจัดจ้างได้ทันทีผ่าน Select ในตารางและหัวการ์ดหน้า detail

**Architecture:** เพิ่ม `updateTenderProjectStatus()` + `useUpdateTenderProjectStatus(id)` ใน data layer, export ชื่อ/สีสถานะจาก `tender-project-status-badge.tsx` ให้ใช้ร่วมกัน, สร้าง `TenderProjectStatusSelect` ตามโครงของ `UserStatusSelect` แล้วแสดงแทน badge เฉพาะเมื่อผู้ใช้มีสิทธิ์ ทั้งในตารางและหน้า detail

**Tech Stack:** Next.js (App Router, client components), TanStack Query, axios, Base UI Select (shadcn wrapper), sonner

Spec: [`docs/superpowers/specs/2026-09-11-tender-project-status-change-design.md`](../specs/2026-09-11-tender-project-status-change-design.md)

## Global Constraints

- **ขอบเขต frontend เท่านั้น** — ห้ามแตะไฟล์ใน `backend/` endpoint `PATCH /api/v1/dashboard/tender-projects/{id}/status` มีอยู่แล้วใน working tree ของอีก session
- **ห้าม commit จนกว่าผู้ใช้จะอนุญาต** — เป็นคำสั่งยืนของผู้ใช้ ทุก task จบที่ `git add` ตามที่ระบุ ห้าม `git commit`
- **ห้าม `git add` ไฟล์ `app/dashboard/tender-projects/detail/page.tsx`** — ไฟล์นี้มีงานของผู้ใช้ที่แก้ค้างไว้ยังไม่ stage การ stage จะดึงงานของผู้ใช้เข้าไปด้วย
- **ห้ามแตะ `create-tender-project-dialog.tsx` และ `edit-tender-project-dialog.tsx`**
- **Permission ที่ frontend เช็คคือ `tender_projects.updateStatus` (ขีดล่าง)** — ไม่ใช่ `tender-projects.updateStatus` ซึ่งเป็นชื่อ gate ฝั่ง route
- **ไม่มี test runner ในโปรเจกต์นี้** — gate คือ `npx tsc --noEmit` + `npx eslint <ไฟล์>` ห้ามเขียน test ห้ามติดตั้ง test framework
- **Gate ของ `tsc` คือ "ไม่มี error ใหม่"** — ผลที่ยอมรับได้มีแค่ 2 บรรทัดเดิมที่ห้ามแก้:
  - `app/(auth)/register/page.tsx(129,118): error TS2322`
  - `app/dashboard/internal-employees/departments-positions/page.tsx(18,40): error TS2322`
- **ห้ามใช้ `npx next build` เป็น gate** — build ไม่ผ่านอยู่แล้วเพราะ error เดิม 2 จุดข้างบน
- **Indentation:** `lib/**` และ `components/tender-project-status-*.tsx` ใช้ 2 spaces / `app/dashboard/tender-projects/**/*.tsx` ใช้ 4 spaces — ห้าม reformat บรรทัดที่ไม่ได้แก้
- **ข้อความ UI ภาษาไทยใช้ตามที่ระบุตรงตัว:** `"กำลังเปลี่ยนสถานะ..."`, `"เปลี่ยนสถานะสำเร็จ"`, `"เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"`
- **สำหรับ controller ที่รันแบบ no-commit:** ทำ checkpoint tree ด้วย index ชั่วคราว (`GIT_INDEX_FILE`) แทน `git add -A` บน index จริง เพื่อไม่ stage ไฟล์ที่ไม่เกี่ยวข้อง

---

### Task 1: Data layer สำหรับเปลี่ยนสถานะ

**Files:**
- Modify: `lib/tender/tender-projects/api.ts` (import block บรรทัด 2-9, และเพิ่มฟังก์ชันระหว่าง `updateTenderProject` กับ `deleteTenderProject`)
- Create: `lib/tender/tender-projects/mutations/useUpdateTenderProjectStatus.ts`

**Interfaces:**
- Consumes: `api` จาก `@/lib/api`, `TenderProjects` และ `TenderProjectStatus` จาก `./types` (มีอยู่แล้ว)
- Produces:
  - `updateTenderProjectStatus(id: number, status: TenderProjectStatus): Promise<TenderProjectStatus>`
  - `useUpdateTenderProjectStatus(id: number)` — mutation ที่ `mutateAsync` รับ `TenderProjectStatus`

- [ ] **Step 1: เพิ่ม `TenderProjectStatus` ใน import block ของ `lib/tender/tender-projects/api.ts`**

แทนบล็อก import บรรทัด 2-9 ด้วย:

```ts
import {
  CreateTenderProjectPayload,
  PaginatedTenderProjectsList,
  TenderProjects,
  TenderProjectSortBy,
  TenderProjectSortDirection,
  TenderProjectStatus,
  UpdateTenderProjectPayload,
} from "./types";
```

- [ ] **Step 2: เพิ่ม `updateTenderProjectStatus` ใน `lib/tender/tender-projects/api.ts`**

วางหลังฟังก์ชัน `updateTenderProject` และก่อน `deleteTenderProject`:

```ts
export async function updateTenderProjectStatus(
  id: number,
  status: TenderProjectStatus,
): Promise<TenderProjectStatus> {
  const { data } = await api.patch<{ data: TenderProjects }>(
    `/api/v1/dashboard/tender-projects/${id}/status`,
    { status },
  );
  return data.data.status;
}
```

- [ ] **Step 3: สร้าง `lib/tender/tender-projects/mutations/useUpdateTenderProjectStatus.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTenderProjectStatus } from "@/lib/tender/tender-projects/api";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";

export function useUpdateTenderProjectStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: TenderProjectStatus) => updateTenderProjectStatus(id, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tenders_projects"] }),
  });
}
```

`["tenders_projects"]` เป็น prefix ของ list, detail (`["tenders_projects", "detail", id]`) และการ์ดสถิติซึ่งมากับ `meta.stats` ของ list — invalidate key เดียวอัปเดตครบทุกจุด

- [ ] **Step 4: ตรวจ types**

Run: `npx tsc --noEmit 2>&1 | grep "error TS"`
Expected: มีแค่ 2 บรรทัดเดิม (`register/page.tsx(129,118)` และ `departments-positions/page.tsx(18,40)`) ไม่มีบรรทัดอื่น

- [ ] **Step 5: ตรวจ lint**

Run: `npx eslint lib/tender/tender-projects/api.ts lib/tender/tender-projects/mutations/useUpdateTenderProjectStatus.ts`
Expected: ไม่มี output

- [ ] **Step 6: Stage (ห้าม commit)**

```bash
git add lib/tender/tender-projects/api.ts lib/tender/tender-projects/mutations/useUpdateTenderProjectStatus.ts
```

---

### Task 2: Shared status style + `TenderProjectStatusSelect`

**Files:**
- Modify: `components/tender-project-status-badge.tsx` (ทั้งไฟล์)
- Create: `components/tender-project-status-select.tsx`

**Interfaces:**
- Consumes: `useUpdateTenderProjectStatus(id)` จาก Task 1, `TenderProjectStatus` จาก `@/lib/tender/tender-projects/types`
- Produces:
  - `TENDER_PROJECT_STATUS_STYLE: Record<TenderProjectStatus, { label: string; badge: string; dot: string }>`
  - `TENDER_PROJECT_STATUSES: TenderProjectStatus[]`
  - `TenderProjectStatusBadge({ status: string; className?: string })` — พฤติกรรมเดิมทุกอย่าง
  - `TenderProjectStatusSelect({ id: number; status: TenderProjectStatus })`

- [ ] **Step 1: เขียน `components/tender-project-status-badge.tsx` ใหม่ทั้งไฟล์**

ชื่อ สี และลำดับของทุกสถานะต้องเหมือนของเดิมทุกตัวอักษร เปลี่ยนแค่ export กับ type ของ key:

```tsx
import { Badge } from "@/components/ui/badge";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";
import { cn } from "@/lib/utils";

export const TENDER_PROJECT_STATUS_STYLE: Record<TenderProjectStatus, { label: string; badge: string; dot: string }> = {
  draft: { label: "ร่าง", badge: "text-gray-600 bg-gray-400/15", dot: "bg-gray-600" },
  published: { label: "กำลังดำเนินการ", badge: "text-blue-600 bg-blue-400/15", dot: "bg-blue-600" },
  closed: { label: "ปิดรับซอง", badge: "text-orange-600 bg-orange-400/15", dot: "bg-orange-600" },
  completed: { label: "เสร็จสิ้น", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  cancelled: { label: "ยกเลิก", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
  archived: { label: "เก็บถาวร", badge: "text-gray-500 bg-gray-300/20", dot: "bg-gray-500" },
};

export const TENDER_PROJECT_STATUSES: TenderProjectStatus[] = [
  "draft",
  "published",
  "closed",
  "completed",
  "cancelled",
  "archived",
];

export function TenderProjectStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = TENDER_PROJECT_STATUS_STYLE[status as TenderProjectStatus];
  if (!style) return null;

  return (
    <Badge className={cn("tracking-wider", style.badge, className)}>
      <span className={cn("w-1.75 h-1.75 rounded-full", style.dot)} />
      {style.label}
    </Badge>
  );
}
```

`status: string` กับการคืน `null` เมื่อไม่รู้จักสถานะต้องคงไว้ เพราะ caller เดิมส่ง string เข้ามา

- [ ] **Step 2: สร้าง `components/tender-project-status-select.tsx`**

```tsx
"use client";

import { isAxiosError } from "axios";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TENDER_PROJECT_STATUSES,
  TENDER_PROJECT_STATUS_STYLE,
} from "@/components/tender-project-status-badge";
import { useUpdateTenderProjectStatus } from "@/lib/tender/tender-projects/mutations/useUpdateTenderProjectStatus";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";
import { cn } from "@/lib/utils";

const STATUS_ITEMS = TENDER_PROJECT_STATUSES.map((value) => ({
  value,
  label: TENDER_PROJECT_STATUS_STYLE[value].label,
}));

// ใช้ message จาก backend เฉพาะ 422 ซึ่งเป็นภาษาไทย ส่วน 403 และ error อื่นของ Laravel เป็นภาษาอังกฤษ
function getErrorMessage(error: unknown): string {
  const message =
    isAxiosError(error) && error.response?.status === 422
      ? (error.response.data as { message?: string } | undefined)?.message
      : undefined;
  return message ?? "เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function TenderProjectStatusSelect({ id, status }: { id: number; status: TenderProjectStatus }) {
  const updateStatus = useUpdateTenderProjectStatus(id);
  const style = TENDER_PROJECT_STATUS_STYLE[status];

  const handleChange = (next: string | null) => {
    if (!next || next === status || updateStatus.isPending) return;
    toast.promise(updateStatus.mutateAsync(next as TenderProjectStatus), {
      loading: "กำลังเปลี่ยนสถานะ...",
      success: "เปลี่ยนสถานะสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <Select items={STATUS_ITEMS} value={status} onValueChange={handleChange}>
      <SelectTrigger size="sm" className={cn("rounded-full border-0 tracking-wider", style.badge)}>
        {updateStatus.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <span className={cn("w-1.75 h-1.75 rounded-full", style.dot)} />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="bottom" alignItemWithTrigger={false}>
        <SelectGroup>
          {TENDER_PROJECT_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {TENDER_PROJECT_STATUS_STYLE[value].label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
```

โครงนี้ตามแบบ `components/user-status-select.tsx` ต่างกันแค่ `getErrorMessage` ที่ใช้ `message` จาก backend เฉพาะ 422

- [ ] **Step 3: ยืนยันว่า caller เดิมของ badge ยังใช้ได้**

Run: `grep -rn "from \"@/components/tender-project-status-badge\"" app components --include=*.tsx`
Expected: เจอ 3 ไฟล์ — `app/dashboard/tender-projects/_components/table/columns.tsx` และ `app/dashboard/tender-projects/detail/page.tsx` (import `TenderProjectStatusBadge` ซึ่งยังใช้ได้เหมือนเดิม ไม่ต้องแก้ใน task นี้) กับ `components/tender-project-status-select.tsx` ที่เพิ่งสร้าง ไม่มีไฟล์ไหน import ชื่อ `STATUS_STYLE` แบบเดิม เพราะมันไม่เคยถูก export

- [ ] **Step 4: ตรวจ types**

Run: `npx tsc --noEmit 2>&1 | grep "error TS"`
Expected: มีแค่ 2 บรรทัดเดิม ไม่มีบรรทัดอื่น

- [ ] **Step 5: ตรวจ lint**

Run: `npx eslint components/tender-project-status-badge.tsx components/tender-project-status-select.tsx`
Expected: ไม่มี output

- [ ] **Step 6: Stage (ห้าม commit)**

```bash
git add components/tender-project-status-badge.tsx components/tender-project-status-select.tsx
```

---

### Task 3: ใช้ Select ในตาราง

**Files:**
- Modify: `app/dashboard/tender-projects/page.tsx` (import block และบรรทัด 64-67)
- Modify: `app/dashboard/tender-projects/_components/table/columns.tsx` (import บรรทัด 10, signature บรรทัด 20, cell ของคอลัมน์ `status` บรรทัด 96-100)

**Interfaces:**
- Consumes: `TenderProjectStatusSelect`, `TenderProjectStatusBadge` จาก Task 2 และ `useAuthPermissions` จาก `@/lib/auth/permissions` (มีอยู่แล้ว คืน `{ hasPermission: (permission: string) => boolean, ... }`)
- Produces: `createColumns(canUpdateStatus: boolean): ColumnDef<TenderProjects>[]`

- [ ] **Step 1: ยืนยันว่า `createColumns` ของ tender-projects มี caller เดียว**

Run: `grep -rn "createColumns" app/dashboard/tender-projects`
Expected: มีแค่ `page.tsx` (import + การเรียกใน `useMemo`) และนิยามใน `_components/table/columns.tsx`

- [ ] **Step 2: เพิ่ม import ใน `app/dashboard/tender-projects/page.tsx`**

เพิ่มบรรทัดนี้ต่อจาก `import { CreateTenderProjectDialog } from "./_components/create-tender-project-dialog";` (บรรทัด 32):

```tsx
import { useAuthPermissions } from "@/lib/auth/permissions";
```

- [ ] **Step 3: ส่งสิทธิ์เข้า `createColumns` ใน `page.tsx`**

แทนบรรทัด 64-67:

```tsx
    const columns = useMemo(
        () => createColumns(),
        [],
    );
```

ด้วย:

```tsx
    const { hasPermission } = useAuthPermissions();
    const canUpdateStatus = hasPermission("tender_projects.updateStatus");

    const columns = useMemo(
        () => createColumns(canUpdateStatus),
        [canUpdateStatus],
    );
```

- [ ] **Step 4: เพิ่ม import ใน `columns.tsx`**

ต่อจาก `import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";` (บรรทัด 10) เพิ่ม:

```tsx
import { TenderProjectStatusSelect } from "@/components/tender-project-status-select";
```

- [ ] **Step 5: เปลี่ยน signature ของ `createColumns`**

แทนบรรทัด 20:

```tsx
export function createColumns(): ColumnDef<TenderProjects>[] {
```

ด้วย:

```tsx
export function createColumns(canUpdateStatus: boolean): ColumnDef<TenderProjects>[] {
```

- [ ] **Step 6: แทน cell ของคอลัมน์ `status`**

แทนบล็อกเดิม:

```tsx
            cell: ({ getValue }) => (
                <div className="flex justify-center">
                    <TenderProjectStatusBadge status={getValue<string>()} />
                </div>
            ),
```

ด้วย:

```tsx
            cell: ({ row }) => (
                <div className="flex justify-center">
                    {canUpdateStatus ? (
                        <TenderProjectStatusSelect
                            key={row.original.id}
                            id={row.original.id}
                            status={row.original.status}
                        />
                    ) : (
                        <TenderProjectStatusBadge status={row.original.status} />
                    )}
                </div>
            ),
```

`key={row.original.id}` จำเป็น — `DataTable` ไม่ได้ตั้ง `getRowId` แถวจึงผูกกับ index ถ้าแถวสลับตำแหน่งหลัง refetch ต้อง remount เพื่อไม่ให้ mutation ที่ค้างอยู่ของโครงการหนึ่งไปแสดงในแถวของอีกโครงการ

ห้ามแตะคอลัมน์อื่น รวมถึง `EditTenderProjectDialog` และ `DeleteTenderProjectDialog` ในคอลัมน์ `actions`

- [ ] **Step 7: ตรวจ types**

Run: `npx tsc --noEmit 2>&1 | grep "error TS"`
Expected: มีแค่ 2 บรรทัดเดิม ไม่มีบรรทัดอื่น

- [ ] **Step 8: ตรวจ lint**

Run: `npx eslint app/dashboard/tender-projects/page.tsx app/dashboard/tender-projects/_components/table/columns.tsx`
Expected: ไม่มี output

- [ ] **Step 9: Stage (ห้าม commit)**

```bash
git add app/dashboard/tender-projects/page.tsx app/dashboard/tender-projects/_components/table/columns.tsx
```

`columns.tsx` มีการแก้ของ edit dialog stage ค้างอยู่แล้ว การ stage รอบนี้จะรวมทั้งสองงานในไฟล์เดียว ซึ่งผู้ใช้รับทราบแล้ว

---

### Task 4: ใช้ Select ในหน้า detail

**Files:**
- Modify: `app/dashboard/tender-projects/detail/page.tsx` (import บรรทัด 8, หลังบรรทัด 21, และบรรทัด 57)

**Interfaces:**
- Consumes: `TenderProjectStatusSelect`, `TenderProjectStatusBadge` จาก Task 2 และ `useAuthPermissions` จาก `@/lib/auth/permissions`

**ข้อควรระวัง:** ไฟล์นี้มีงานของผู้ใช้ที่แก้ค้างไว้และยังไม่ stage (summary grid, TOR card ฯลฯ) ห้ามแตะส่วนอื่นนอกจาก 3 จุดที่ระบุ ห้าม revert ห้าม reformat และ **ห้าม `git add` ไฟล์นี้**

- [ ] **Step 1: เพิ่ม import**

ต่อจาก `import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";` (บรรทัด 8) เพิ่ม 2 บรรทัด:

```tsx
import { TenderProjectStatusSelect } from "@/components/tender-project-status-select";
import { useAuthPermissions } from "@/lib/auth/permissions";
```

- [ ] **Step 2: ดึงสิทธิ์ก่อน early return**

ต่อจากบรรทัด:

```tsx
    const { project, isValidId, isPending, notFound } = useTenderProjectDetailPage(id);
```

เพิ่ม:

```tsx
    const { hasPermission } = useAuthPermissions();
    const canUpdateStatus = hasPermission("tender_projects.updateStatus");
```

ต้องอยู่ **ก่อน** `if (isValidId && isPending)` เพราะ `useAuthPermissions` เป็น hook ถ้าวางหลัง early return จะผิด rules of hooks

- [ ] **Step 3: แทน badge ที่หัวการ์ด**

แทนบรรทัด:

```tsx
                        <TenderProjectStatusBadge status={project.status} />
```

ด้วย:

```tsx
                        {canUpdateStatus ? (
                            <TenderProjectStatusSelect key={project.id} id={project.id} status={project.status} />
                        ) : (
                            <TenderProjectStatusBadge status={project.status} />
                        )}
```

`key={project.id}` ทำให้ remount เมื่อผู้ใช้เปลี่ยนไปดูโครงการอื่นระหว่างที่ mutation ยังค้าง ไม่ให้ spinner ของโครงการเดิมโผล่ในโครงการใหม่

- [ ] **Step 4: ยืนยันว่าแก้แค่ 3 จุด**

Run: `git diff -- app/dashboard/tender-projects/detail/page.tsx`
Expected: diff จะมีงานเดิมของผู้ใช้ปนอยู่ด้วย (เทียบกับ HEAD) ให้ตรวจว่าส่วนที่เพิ่มในรอบนี้มีแค่ 2 import, 2 บรรทัดดึงสิทธิ์ และบล็อกเงื่อนไข select/badge ไม่มีบรรทัดอื่นของผู้ใช้หายหรือถูกเปลี่ยน

- [ ] **Step 5: ตรวจ types**

Run: `npx tsc --noEmit 2>&1 | grep "error TS"`
Expected: มีแค่ 2 บรรทัดเดิม ไม่มีบรรทัดอื่น

- [ ] **Step 6: ตรวจ lint**

Run: `npx eslint app/dashboard/tender-projects/detail/page.tsx components/tender-project-status-select.tsx`
Expected: ไม่มี output — โดยเฉพาะต้องไม่มี `react-hooks/rules-of-hooks`

- [ ] **Step 7: ไม่ stage ไฟล์นี้**

ห้ามรัน `git add` กับ `app/dashboard/tender-projects/detail/page.tsx` ให้รายงานว่าไฟล์นี้แก้ไว้ใน working tree แล้ว รอผู้ใช้ตัดสินใจ stage เองพร้อมงานที่ค้างอยู่

- [ ] **Step 8: ส่ง manual QA checklist ให้ผู้ใช้**

เครื่องนี้ไม่มี browser automation ให้รายงานผู้ใช้พร้อมรายการตรวจ:

1. ผู้ใช้ที่มี `tender_projects.updateStatus` เห็น Select ทั้งในตารางและหัวการ์ดหน้า detail ส่วนผู้ใช้ที่ไม่มีเห็น badge เหมือนเดิม
2. เปลี่ยนสถานะในตาราง → มี toast "เปลี่ยนสถานะสำเร็จ", สีและชื่อสถานะของแถวเปลี่ยน, การ์ดสถิติ "กำลังดำเนินการ"/"เสร็จสิ้น" อัปเดตตาม
3. เปลี่ยนในหน้า detail → กลับไปหน้าตารางแล้วเห็นสถานะใหม่
4. เลือกสถานะเดิมซ้ำ → ไม่มี request ใน Network tab และไม่มี toast
5. ระหว่างรอ response ปุ่มแสดง spinner และกดเลือกซ้ำไม่ยิง request เพิ่ม
6. ถ้ากรองสถานะอยู่แล้วเปลี่ยนเป็นสถานะอื่น → แถวหายจากตารางหลัง refetch ซึ่งเป็นพฤติกรรมที่ถูกต้อง

---

## สิ่งที่อยู่นอกขอบเขต plan นี้

- Dialog ยืนยันก่อนเปลี่ยนสถานะ (ผู้ใช้เลือกให้เปลี่ยนทันที)
- กติกาว่าเปลี่ยนจากสถานะไหนไปไหนได้ (backend อนุญาตทุกทาง ห้ามแค่สถานะเดิม)
- การ gate ปุ่มดู/แก้ไข/ลบด้วย permission
- ทุกอย่างใน `backend/`
- Stage/commit `app/dashboard/tender-projects/detail/page.tsx`
