# Notification dropdown ใน navbar (frontend only)

## Context

`components/navbar.tsx`'s `NotificationButton` เป็นแค่ปุ่มกระดิ่งเฉย ๆ ไม่มี dropdown/เนื้อหาอะไรเลย
ในขณะที่ `app/(public)/profiles/_components/sidebar.tsx` มี logic เช็ก "ข้อมูลกรอกไม่ครบ" อยู่แล้ว 4 ตัว
(`hasVertifyEmail`, `hasIncompleteAddress`, `hasIncompleteContact`, `hasIncompleteDocument`) คำนวณจาก
`useUser()`/`useVendorProfile()` ที่มีอยู่แล้วทั้งคู่ ไม่มี backend notification API ใด ๆ ในระบบ

งานนี้ทำ dropdown แจ้งเตือนใน navbar โดยใช้ logic ชุดเดียวกับ sidebar (ไม่สร้าง backend ใหม่) — ย้าย
logic ออกมาเป็น shared hook เพื่อไม่ให้ตรรกะ "ข้อมูลไม่ครบ" ซ้ำกันสองที่

`navbar.tsx` เป็น component กลางที่ขึ้นทุกหน้ารวมถึงฝั่ง internal (พนักงานภายใน) ซึ่งไม่มี vendor profile
เลย — ตกลงกันแล้วว่า notification เหล่านี้โชว์เฉพาะ `user.userType` เป็น `"company"` หรือ `"individual"`
เท่านั้น (internal เห็นปุ่มกระดิ่งเหมือนเดิมแต่ dropdown ว่าง)

ข้อมูล vendor profile/user ใช้ React Query cache (`useVendorProfile`/`useUser`) อยู่แล้วซึ่ง global/shared
ระหว่าง component โดยธรรมชาติ (key เดียวกัน ไม่มี fetch ซ้ำ) — ไม่ต้องเพิ่ม Zustand store ซ้อนอีกชั้น

## Part 1: `lib/vendor/useVendorProfileCompleteness.ts` (ใหม่)

ย้าย 4 boolean check จาก `sidebar.tsx` มาไว้ตรงนี้ทั้งหมด (เนื้อหา logic เดิมเป๊ะ ไม่เปลี่ยนเงื่อนไข)
คืนค่าเป็น boolean ดิบ ๆ ไม่รวม label/icon/route เพราะ `sidebar.tsx` กับ notification dropdown
ใช้ข้อความคนละสไตล์ (sidebar เป็นชื่อเมนูสั้น ๆ, notification เป็นข้อความเชิง action):

```ts
import { useUser } from "@/lib/auth/useUser";
import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import { REQUIRED_DOCUMENTS } from "@/app/(public)/profiles/data/document-types";

export interface VendorProfileCompleteness {
  isLoading: boolean;
  hasVertifyEmail: boolean;
  hasIncompleteAddress: boolean;
  hasIncompleteContact: boolean;
  hasIncompleteDocument: boolean;
}

export function useVendorProfileCompleteness(): VendorProfileCompleteness {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: vendor, isPending } = useVendorProfile();

  const hasVertifyEmail = !isUserLoading && !user?.emailVerifiedAt;

  const hasIncompleteAddress =
    !isPending &&
    (!vendor || !vendor.detail.address || !vendor.detail.province || !vendor.detail.postalCode);

  const hasIncompleteContact =
    !isPending &&
    (!vendor ||
      !vendor.contact ||
      vendor.contact.length === 0 ||
      !vendor.contact?.[0]?.contactName ||
      !vendor.contact?.[0]?.contactEmail ||
      !vendor.contact?.[0]?.contactPhone);

  const hasIncompleteDocument =
    !isPending &&
    (!vendor ||
      REQUIRED_DOCUMENTS[vendor.detail.type]
        .filter((doc) => doc.required)
        .some((doc) => !vendor.document?.some((d) => d.documentType === doc.key)));

  return {
    isLoading: isUserLoading || isPending,
    hasVertifyEmail,
    hasIncompleteAddress,
    hasIncompleteContact,
    hasIncompleteDocument,
  };
}
```

Import `REQUIRED_DOCUMENTS` ข้าม route group ผ่าน absolute alias (`@/app/(public)/profiles/data/...`) —
ไฟล์ `_data`/`_components` ใต้ App Router import ข้ามที่ไหนก็ได้ปกติ (แค่ prefix `_`/route group เว้นจาก
routing ไม่ใช่จาก module resolution) เหมือนที่ `sidebar.tsx` เดิม import จากที่เดียวกันอยู่แล้ว (แค่คนละ
lib path)

## Part 2: `sidebar.tsx` แก้ให้ใช้ hook แทน

ลบ 4 บรรทัด logic ที่ inline อยู่ตอนนี้ (`hasVertifyEmail`...`hasIncompleteDocument`) แทนด้วย:

```ts
const { hasVertifyEmail, hasIncompleteAddress, hasIncompleteContact, hasIncompleteDocument } =
  useVendorProfileCompleteness();
```

`menus` array, label, icon, route เดิมทั้งหมดไม่เปลี่ยน — behavior/UI ของ sidebar เดิมทุกอย่างเหมือนเดิม
เป๊ะ (แค่ source ของ boolean ย้ายที่)

## Part 3: `navbar.tsx` — `NotificationButton` → `NotificationMenu`

แทนที่ปุ่มกระดิ่งเฉย ๆ ด้วย `DropdownMenu` (โครงเดียวกับ `ProfileMenu` ที่มีอยู่แล้วในไฟล์นี้):

```tsx
function NotificationMenu() {
  const { data: user } = useUser();
  const { hasVertifyEmail, hasIncompleteAddress, hasIncompleteContact, hasIncompleteDocument } =
    useVendorProfileCompleteness();

  const isVendor = user?.userType === "company" || user?.userType === "individual";

  const notifications = isVendor
    ? [
        { key: "account", label: "ยืนยันอีเมลของคุณ", href: routes.profiles.profile, show: hasVertifyEmail },
        { key: "vendor-info", label: "กรอกข้อมูลกิจการให้ครบถ้วน", href: routes.profiles.vendorInfo, show: hasIncompleteAddress },
        { key: "contact", label: "เพิ่มข้อมูลผู้ติดต่อให้ครบถ้วน", href: routes.profiles.contract, show: hasIncompleteContact },
        { key: "document", label: "แนบเอกสารประกอบให้ครบถ้วน", href: routes.profiles.document, show: hasIncompleteDocument },
      ].filter((n) => n.show)
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="การแจ้งเตือน"
            className="relative flex items-center justify-center rounded-full p-2 text-muted-foreground cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
          />
        }
      >
        <Bell className="size-5" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-1.75 h-1.75 rounded-full bg-red-600" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            ไม่มีการแจ้งเตือนใหม่
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.key} render={<Link href={n.href} />} className="cursor-pointer">
              {n.label}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Import เพิ่มใน `navbar.tsx`: `useVendorProfileCompleteness` จาก `@/lib/vendor/useVendorProfileCompleteness`
เรียกใช้ที่เดิม (`{user && <NotificationMenu />}`) ไม่เปลี่ยนเงื่อนไขการ render ระดับบนสุด (ยังโชว์ปุ่ม
กระดิ่งให้ทุก user ที่ login แล้ว แค่เนื้อหาข้างในต่างกันตาม `userType`)

จุดแดงบนกระดิ่งใช้สไตล์เดียวกับจุดแดงใน `sidebar.tsx` (`w-1.75 h-1.75 rounded-full bg-red-600`) เพื่อความ
สอดคล้องกันทั้งแอป

## Out of scope

- Notification ประเภทอื่นที่ไม่ใช่ "ข้อมูลไม่ครบ" (เช่น เอกสารได้รับอนุมัติ/ถูกปฏิเสธ, ข้อความจากแอดมิน) —
  ต้องมี backend notification system ซึ่งยังไม่มีในระบบตอนนี้ เป็นงานแยกในอนาคต
- Read/unread state หรือการ mark-as-read — ณ ตอนนี้ notification ทั้งหมดเป็น derived state ล้วน ๆ
  (หายไปเองเมื่อกรอกข้อมูลครบ ไม่ใช่ persisted record ที่ mark ได้)
- Global store (Zustand) — ข้อมูลที่ใช้มาจาก React Query cache ที่ share กันระหว่าง component อยู่แล้ว
  โดยธรรมชาติ ไม่ต้องมี state layer เพิ่ม

## Testing

ไม่มี test runner ในโปรเจกต์นี้ (ตาม spec เดิมทุกอัน) verify ด้วยมือ:
1. Login เป็น vendor (company/individual) ที่กรอกข้อมูลไม่ครบ → กระดิ่งมีจุดแดง → เปิด dropdown เห็น
   รายการที่ตรงกับ warning dot ใน sidebar เป๊ะ → กดแต่ละรายการ → นำไปหน้าที่ถูกต้อง
2. Login เป็น vendor ที่กรอกข้อมูลครบทุกอย่าง → กระดิ่งไม่มีจุดแดง → เปิด dropdown เห็น "ไม่มีการแจ้งเตือนใหม่"
3. Login เป็น internal (พนักงานภายใน) → กระดิ่งไม่มีจุดแดง → เปิด dropdown เห็น "ไม่มีการแจ้งเตือนใหม่"
   เสมอ (ไม่ error แม้ไม่มี vendor profile)
4. เช็คว่า sidebar ยังทำงานเหมือนเดิมทุกอย่างหลัง refactor (จุดแดงตรงเมนูย่อยทั้ง 4 ตัวยังตรงเหมือนก่อนแก้)
5. เช็คทั้ง light/dark mode
