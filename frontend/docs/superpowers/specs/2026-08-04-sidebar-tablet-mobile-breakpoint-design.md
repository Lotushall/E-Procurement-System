# Sidebar ใช้โหมดมือถือ (Sheet) ที่ขนาดจอ tablet ด้วย

## Context

ตอนนี้ sidebar (`components/ui/sidebar.tsx`) ตัดสินโหมดการแสดงผลด้วย flag `isMobile` จาก
hook `useIsMobile()` ใน `hooks/use-mobile.ts`:

- `isMobile === true` → render เป็น `Sheet` (เมนูเลื่อนออกจากด้านข้าง มี overlay, ปิดเองเมื่อกดลิงก์)
- `isMobile === false` → render sidebar แบบ desktop (fixed, ย่อ/ขยายเป็นไอคอนได้)

`useIsMobile()` เช็คด้วย `MOBILE_BREAKPOINT = 768` (`matchMedia(max-width: 767px)`) ซึ่งตรงกับ
ขอบล่างของ breakpoint `md` ใน Tailwind พอดี ผลคือช่วงจอ tablet (768–1023px, tier `md`) ใช้
sidebar แบบ desktop อยู่ — ผู้ใช้อยากให้ช่วงนี้เป็นแบบมือถือ (Sheet) เหมือนกับจอมือถือ

ตรวจสอบแล้วว่า `useIsMobile` ถูก import ใช้ที่เดียวคือใน `sidebar.tsx` (grep ทั้งโปรเจกต์ไม่เจอที่อื่น)
และ `SidebarTrigger`/`toggleSidebar()` เช็ค `isMobile`จาก context เองอยู่แล้วเวลาสลับ state ที่ถูก
ดังนั้นการเปลี่ยนแค่ breakpoint ไม่กระทบโค้ดส่วนอื่น

## การเปลี่ยนแปลง

ไฟล์เดียว — `hooks/use-mobile.ts`: เปลี่ยน `MOBILE_BREAKPOINT` จาก `768` เป็น `1024`
(เท่ากับ breakpoint `lg` ของ Tailwind)

ผลลัพธ์:

- **< 1024px** (ครอบคลุม sm และ md เดิม รวม tablet): sidebar เป็น Sheet แบบมือถือ
- **≥ 1024px** (lg ขึ้นไป): sidebar เป็น desktop แบบย่อ/ขยายไอคอนเหมือนเดิม

## Out of scope

- ไม่แตะ layout อื่นๆ ที่อาจใช้ breakpoint `md` เป็นเกณฑ์ (เช่น navbar, ตาราง) — ขอบเขตงานนี้คือ
  พฤติกรรมของ sidebar เท่านั้น
- ไม่เพิ่ม breakpoint ใหม่ (เช่นแยก sm/md ออกจากกัน) — ผู้ใช้ยืนยันว่าอยากให้ sm และ md ใช้พฤติกรรม
  เดียวกันทั้งคู่ (Sheet)

## Testing

ไม่มี test runner ในโปรเจกต์นี้ verify ด้วยมือผ่าน browser devtools (responsive mode):

1. จอ < 768px (มือถือ): sidebar ยังเป็น Sheet เหมือนเดิม (ไม่ regress)
2. จอ 768–1023px (tablet/md): sidebar เป็น Sheet แล้ว (เดิมเคยเป็น desktop แบบย่อไอคอน) — กด
   `SidebarTrigger` เปิด/ปิดเมนูได้ปกติ, กดลิงก์ในเมนูแล้ว Sheet ปิดเอง
3. จอ ≥ 1024px (lg ขึ้นไป): sidebar ยังเป็น desktop แบบย่อ/ขยายไอคอนเหมือนเดิม (ไม่ regress)
4. รีเฟรชหน้าที่ขนาดจอ tablet แล้ว sidebar เปิด/ปิดถูกต้องตั้งแต่โหลดครั้งแรก (ไม่มี layout shift ผิดปกติ)
