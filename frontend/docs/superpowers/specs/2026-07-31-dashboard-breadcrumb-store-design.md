# Breadcrumb ผ่าน layout + zustand store

## Context

`docs/superpowers/specs/2026-07-30-dashboard-breadcrumb-design.md` ตกลงกันไว้ว่าให้แต่ละหน้าใน
`app/dashboard/` ประกาศ JSX ของ `<Breadcrumb>` เอง (ไม่แตะ `layout.tsx`) ตอนนี้มีแค่
`app/dashboard/tor/page.tsx` ที่ implement ตาม spec นั้นไปแล้ว (และเบี้ยวไปนิดคือใช้ `<span>/</span>`
เป็น separator แทน `BreadcrumbSeparator`) ส่วน `vendors/page.tsx` และ `vendors/[id]` ยังไม่มี breadcrumb
เลย

Spec นี้ **แทนที่แนวทางเดิม**: breadcrumb ย้ายไป render จุดเดียวใน `app/dashboard/layout.tsx` โดยแต่ละ
หน้า "บอก" ค่า breadcrumb ของตัวเองผ่าน zustand store แทนการประกาศ JSX ซ้ำทุกหน้า เหตุผล (จากผู้ใช้):
ต้องการรวม breadcrumb ไว้ที่ layout จุดเดียว และมี zustand อยู่แล้วในโปรเจกต์ (`package.json` มี
`zustand@^5.0.14` แต่ยังไม่เคยมี store ไหนถูกสร้างจริง — นี่จะเป็นตัวแรก)

`components/ui/breadcrumb.tsx` (primitive เดิม: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`,
`BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`) ใช้งานได้ตรงตามเดิม ไม่ต้องแก้

## Part 1: `lib/breadcrumb/store.ts` (ใหม่)

Zustand store เก็บ breadcrumb items ปัจจุบัน ตามคอนเวนชันโฟลเดอร์ domain ที่มีอยู่แล้วในโปรเจกต์
(`lib/vendor-approval/`, `lib/auth/`, ฯลฯ) — ไม่ใช้โฟลเดอร์ `hooks/` เพราะไฟล์เดียวที่อยู่ในนั้นตอนนี้
(`use-mobile.ts`) มาจาก shadcn scaffold ไม่ใช่คอนเวนชันจริงของแอป

```ts
import { create } from "zustand";

export type BreadcrumbItem = {
  label?: string;
  href?: string;
  loading?: boolean;
};

type BreadcrumbState = {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
  clear: () => void;
};

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  clear: () => set({ items: [] }),
}));
```

`label` เป็น optional เพราะตอน `loading: true` ไม่มีความหมาย (layout render `Skeleton` แทน โดยไม่สนใจ
`label`)

## Part 2: `lib/breadcrumb/useBreadcrumb.ts` (ใหม่)

Hook ที่หน้า/component เรียกเพื่อลงทะเบียน breadcrumb ของตัวเองเข้า store ตอน mount และล้างตอน unmount
ใช้ `JSON.stringify(items)` เป็น dependency key ของ `useEffect` แทนตัว array ตรง ๆ เพราะ caller มักสร้าง
array literal ใหม่ทุก render (เช่น `useBreadcrumb([{ label: "..." }])` ใน JSX) — ถ้าใช้ `items` ตรง ๆ เป็น
dependency จะ re-run ทุก render โดยไม่จำเป็น

```ts
import { useEffect } from "react";
import { useBreadcrumbStore, type BreadcrumbItem } from "./store";

export function useBreadcrumb(items: BreadcrumbItem[]) {
  const setItems = useBreadcrumbStore((s) => s.setItems);
  const clear = useBreadcrumbStore((s) => s.clear);
  const key = JSON.stringify(items);

  useEffect(() => {
    setItems(items);
    return () => clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key already captures items' content
  }, [key]);
}
```

หน้า `app/dashboard/page.tsx` (root) ไม่เรียก hook นี้เลย → store ว่างเปล่า → ไม่มี breadcrumb แสดง ตรง
ตามที่ต้องการ (root ไม่มีประโยชน์ที่จะมี breadcrumb 1 อัน)

## Part 3: `app/dashboard/_components/dashboard-breadcrumb.tsx` (ใหม่)

Client component อ่าน store แล้ว render `<Breadcrumb>` เดียวใน layout เติม "แดชบอร์ด" (ลิงก์ไป
`routes.dashboards.dashboard`) เป็น item แรกเสมอเมื่อ store ไม่ว่าง:

```tsx
"use client";

import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { routes } from "@/lib/routes";

export function DashboardBreadcrumb() {
  const items = useBreadcrumbStore((s) => s.items);

  if (items.length === 0) return null;

  const allItems = [{ label: "แดชบอร์ด", href: routes.dashboards.dashboard }, ...items];

  return (
    <Breadcrumb className="mb-2">
      <BreadcrumbList>
        {allItems.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.loading ? (
                <Skeleton className="h-4 w-24" />
              ) : item.href ? (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
```

`index` เป็น key ใช้ได้เพราะ list นี้ไม่ reorder/insert ตรงกลาง แค่ replace ทั้งก้อนทุกครั้งที่ store
เปลี่ยน

## Part 4: `app/dashboard/layout.tsx`

เพิ่ม `<DashboardBreadcrumb />` เหนือ `{children}` จุดเดียว:

```tsx
<SidebarInset className="pt-14">
  <div className="flex flex-1 flex-col px-6.5 pt-5.5 pb-10">
    <DashboardBreadcrumb />
    {children}
  </div>
</SidebarInset>
```

## Part 5: ย้ายทั้ง 3 หน้าที่เกี่ยวข้องมาใช้ hook

**`app/dashboard/tor/page.tsx`** — ปัจจุบันเป็น server component ต้องเติม `"use client"` เพราะเรียก
hook ที่มี `useEffect`:

```tsx
"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";

export default function TorIndex() {
  useBreadcrumb([{ label: "การจัดการ TOR" }]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">การจัดการ TOR</h1>
    </div>
  );
}
```

(เลิกใช้ `<span>/</span>` เป็น separator ที่เบี้ยวจาก spec เดิม — ตอนนี้ separator เป็นหน้าที่ของ
`DashboardBreadcrumb` ที่ใช้ `BreadcrumbSeparator` ไอคอน chevron ให้ทุกหน้าเหมือนกันโดยอัตโนมัติ)

**`app/dashboard/vendors/page.tsx`**:

```tsx
"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";

export default function VendorRegistrationPage() {
  useBreadcrumb([{ label: "ผู้ค้าที่ลงทะเบียน" }]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">ผู้ค้าที่ลงทะเบียน</h1>
    </div>
  );
}
```

**`app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx`** — เพิ่ม `displayName` (ย้ายขึ้นมา
คำนวณก่อน early-return แทนที่จะอยู่หลัง) และเรียก `useBreadcrumb` ก่อนถึง `if (isPending) return ...`
เดิม เพราะกฎของ hooks ห้ามเรียกแบบ conditional อยู่แล้ว จึง **ไม่ต้อง restructure early-return** เหมือนที่
spec 30 ก.ค. วางแผนไว้ (เดิมวางแผนให้รวม breadcrumb เข้ากับ body เป็น single-return — ตอนนี้ไม่จำเป็น
เพราะ breadcrumb แยก render โดย layout ไปแล้ว):

```tsx
export function VendorDetailView({ vendorId }: { vendorId: number }) {
  const { data: vendor, isPending, isError } = useVendorDetail(vendorId);
  const approveVendor = useApproveVendor(vendorId);
  const rejectVendor = useRejectVendor(vendorId);

  const displayName = vendor
    ? vendor.detail.type === "company"
      ? vendor.detail.companyName
      : vendor.detail.storeName
    : undefined;

  useBreadcrumb([
    { label: "ผู้ค้าที่ลงทะเบียน", href: routes.dashboards.vendors.index },
    isPending ? { loading: true } : { label: displayName ?? "ไม่พบข้อมูลผู้ขายรายนี้" },
  ]);

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">ไม่พบข้อมูลผู้ขายรายนี้</p>
    );
  }

  const handleApprove = () => {
    /* เหมือนเดิมทุกประการ ... */
  };

  return (
    /* เหมือนเดิมทุกประการ ไม่ต้องแก้ JSX ส่วนล่าง ... */
  );
}
```

เพิ่ม import `useBreadcrumb` (`@/lib/breadcrumb/useBreadcrumb`) และ `routes` (`@/lib/routes`) เข้าไฟล์
เดิมไม่ต้องเพิ่ม `Skeleton` import ใน component นี้อีก เพราะ skeleton ตอน loading render โดย
`DashboardBreadcrumb` ไม่ใช่หน้านี้

## Out of scope

- Auto-generate breadcrumb จาก URL — เหมือน spec เดิม ยังมีแค่ 4 route ไม่คุ้มสร้างระบบ mapping
- Ellipsis/collapse สำหรับ breadcrumb ยาว ๆ — เส้นทางลึกสุดตอนนี้มีแค่ 3 ระดับ
- Breadcrumb ในหน้า public (`app/(public)/...`) — ขอบเขตงานนี้คือ dashboard เท่านั้น
- Persist store ข้าม navigation ด้วย `persist` middleware ของ zustand — ไม่จำเป็น breadcrumb เป็น
  ephemeral UI state ที่ควร reset ทุกครั้งที่เปลี่ยนหน้าอยู่แล้ว

## Testing

ไม่มี test runner ในโปรเจกต์นี้ verify ด้วยมือ (เหมือน spec เดิม):

1. เข้า `/dashboard` → ไม่มี breadcrumb
2. เข้า `/dashboard/tor` → เห็น "แดชบอร์ด / การจัดการ TOR" (separator เป็นไอคอน chevron ไม่ใช่ `/`
   ตัวอักษรแล้ว) กด "แดชบอร์ด" ไปหน้า `/dashboard` ได้
3. เข้า `/dashboard/vendors` → เห็น "แดชบอร์ด / ผู้ค้าที่ลงทะเบียน"
4. เข้า `/dashboard/vendors/[id]` → ตอนโหลดเห็น skeleton ที่ crumb สุดท้าย โหลดเสร็จเปลี่ยนเป็นชื่อผู้ขาย
   (หรือ "ไม่พบข้อมูลผู้ขายรายนี้" ถ้าไม่มี backend จริงตอบกลับ) กด "แดชบอร์ด" และ "ผู้ค้าที่ลงทะเบียน"
   นำทางถูกต้องทั้งคู่
5. สลับหน้าไปมาระหว่าง `/dashboard/tor` ↔ `/dashboard/vendors` ↔ `/dashboard` เร็ว ๆ → breadcrumb ต้อง
   ไม่ค้างจากหน้าก่อน (เช็ค store clear ตอน unmount ทำงานถูกต้อง)
6. เช็คทั้ง light/dark mode และ responsive (breadcrumb ไม่ล้น container บนจอแคบ — ใช้ `flex-wrap` ไว้
   แล้วใน `BreadcrumbList`)
