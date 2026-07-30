# Breadcrumb navigation ใน dashboard

## Context

หน้าใน `app/dashboard/` ตอนนี้ยังไม่มี breadcrumb เลย ผู้ใช้ที่เข้าหน้าลึก ๆ เช่น
`/dashboard/vendors/[id]` ไม่มีทางย้อนกลับไปหน้ารายการได้นอกจากปุ่ม back ของเบราว์เซอร์หรือ sidebar

โปรเจกต์นี้ยังไม่มี breadcrumb component เลยแม้แต่ตัวเดียว (`grep` ไม่เจอ) และ `components.json`
ตั้งค่า shadcn ไว้เป็น style `base-nova` ที่ build บน `@base-ui/react` (ไม่ใช่ Radix) — component
ที่มีอยู่แล้วอย่าง `button.tsx`/`dropdown-menu.tsx` import จาก `@base-ui/react/*` ทั้งคู่ breadcrumb เป็น
แค่ navigation ธรรมดา ไม่มี popup/interaction ที่ต้องพึ่ง primitive ของ base-ui เลย เลยไม่จำเป็นต้องมี
dependency นั้น — ห่อ Next `<Link>` ตรง ๆ พอ

ตกลงกับผู้ใช้แล้วว่าใช้แบบ **ระบุเองทีละหน้า** (ไม่ auto-generate จาก URL) เพราะตอนนี้มีแค่ 4 หน้าใน
dashboard ยังไม่คุ้มที่จะสร้างระบบ mapping + override ให้ซับซ้อนขึ้น

## Part 1: `components/ui/breadcrumb.tsx` (ใหม่)

Primitive ใหม่สไตล์เดียวกับ shadcn component อื่น ๆ ในโฟลเดอร์นี้ (`badge.tsx`, `separator.tsx` ฯลฯ)
ไม่พึ่ง base-ui เพราะไม่มี interactive state:

```tsx
import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav aria-label="breadcrumb" data-slot="breadcrumb" className={className} {...props} />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="breadcrumb-link"
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      <ChevronRightIcon />
    </li>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
```

## Part 2: ใช้งานในแต่ละหน้า

วางเหนือ `<h1>` เดิมของแต่ละหน้า (ไม่แตะ `layout.tsx`) คั่นด้วย `mb-2` เท่ากันทุกหน้า:

**`app/dashboard/page.tsx`** — ไม่เพิ่ม breadcrumb (root ของ dashboard มีแค่ 1 crumb ไม่มีประโยชน์)

**`app/dashboard/tor/page.tsx`**:

```tsx
<Breadcrumb className="mb-2">
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href={routes.dashboards.dashboard}>แดชบอร์ด</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>การจัดการ TOR</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

**`app/dashboard/vendors/page.tsx`**: เหมือนกันแต่ crumb สุดท้ายเป็น "ผู้ค้าที่ลงทะเบียน"

**`app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx`**: เพิ่ม crumb ที่สาม เป็นชื่อผู้ขาย
(`displayName`) วางเหนือ `<div className="flex items-center justify-between ...">` เดิม (บรรทัดแรกสุด
ของ return) — ระหว่าง `isPending` (ก่อนถึง early-return ของ pending state ปัจจุบัน) crumb 2 อันแรกโชว์
ทันที ส่วนอันที่ 3 โชว์ `Skeleton` แทน:

```tsx
<Breadcrumb className="mb-2">
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href={routes.dashboards.dashboard}>แดชบอร์ด</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href={routes.dashboards.vendors.index}>ผู้ค้าที่ลงทะเบียน</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      {isPending ? (
        <Skeleton className="h-4 w-24" />
      ) : (
        <BreadcrumbPage>{displayName}</BreadcrumbPage>
      )}
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

เพราะ breadcrumb ต้อง render ก่อนถึง `isPending`/`isError` early-return ที่มีอยู่แล้วในไฟล์ (ไม่งั้นจะ
หายไปตอนโหลด/error) ต้องจัดโครงสร้างใหม่เล็กน้อย: breadcrumb คงที่ 2 อันแรกอยู่นอก early-return ส่วน
`isPending`/`isError` ที่เหลือ (การ์ดข้อมูล, ปุ่มอนุมัติ, เอกสาร) ยังคง return แยกเหมือนเดิม แค่ครอบด้วย
breadcrumb ที่ static อยู่ด้านบนเสมอ

## Out of scope

- Auto-generate breadcrumb จาก URL — ตกลงกันแล้วว่าระบุเองทีละหน้าเพราะมีแค่ 4 หน้า
- Ellipsis/collapse สำหรับ breadcrumb ยาว ๆ — เส้นทางลึกสุดตอนนี้มีแค่ 3 ระดับ ไม่จำเป็น
- Breadcrumb ในหน้า public (`app/(public)/...`) — ขอบเขตงานนี้คือ dashboard เท่านั้น

## Testing

ไม่มี test runner ในโปรเจกต์นี้ verify ด้วยมือ:
1. เข้า `/dashboard` → ไม่มี breadcrumb
2. เข้า `/dashboard/tor` → เห็น "แดชบอร์ด / การจัดการ TOR" กด "แดชบอร์ด" ไปหน้า `/dashboard` ได้
3. เข้า `/dashboard/vendors` → เห็น "แดชบอร์ด / ผู้ค้าที่ลงทะเบียน"
4. เข้า `/dashboard/vendors/[id]` → ตอนโหลดเห็น skeleton ที่ crumb สุดท้าย โหลดเสร็จเปลี่ยนเป็นชื่อผู้ขาย
   กด "แดชบอร์ด" และ "ผู้ค้าที่ลงทะเบียน" นำทางถูกต้องทั้งคู่
5. เช็คทั้ง light/dark mode และ responsive (breadcrumb ไม่ล้น container บนจอแคบ — ใช้ `flex-wrap` ไว้แล้ว)
