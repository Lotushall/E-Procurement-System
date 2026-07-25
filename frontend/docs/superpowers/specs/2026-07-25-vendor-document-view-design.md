# ปุ่ม "ดูไฟล์" ใน DocumentRow (frontend, needs backend endpoint)

## Context

Backend เพิ่ม `GET /api/v1/vendor/document/{id}/view` แล้ว (มิเรอร์ session-cookie auth เดิมของ endpoint
อื่น ๆ ในกลุ่ม `auth` middleware, ดู `backend/docs/superpowers/specs/2026-07-25-vendor-document-view-design.md`)
คืนไฟล์จริงแบบ `Content-Disposition: inline` — เปิด URL นี้ตรง ๆ ในเบราว์เซอร์แล้ว render PDF/รูปภาพได้เลย
ไม่ต้อง fetch เป็น blob ก่อน (คุกกี้ session ของ Sanctum ติดไปกับ navigation ปกติอยู่แล้ว เหมือนหน้าเว็บ
ที่ auth ทุกหน้า)

`document-row.tsx` (`app/(public)/profiles/document/_components/document-row.tsx`) ตอนนี้มีแค่ปุ่ม
"แนบไฟล์"/"เปลี่ยนไฟล์" กับปุ่มลบ (`DeleteDocumentDialog`) ไม่มีทางดูไฟล์ที่อัปโหลดไปแล้วเลย

## Part 1: `lib/vendor/api.ts`

เพิ่ม helper คืน URL ตรง ๆ (ไม่ใช่ `api.get` เพราะจะเปิดผ่าน `<a target="_blank">` ให้เบราว์เซอร์ navigate
เอง ไม่ใช่ axios call):

```ts
export function getVendorDocumentViewUrl(id: number): string {
  return `${process.env.NEXT_PUBLIC_API_URL}/api/v1/vendor/document/${id}/view`;
}
```

## Part 2: `document-row.tsx`

เพิ่มปุ่ม "ดูไฟล์" (ไอคอน `Eye` จาก lucide-react) ข้าง `DeleteDocumentDialog` เดิม เงื่อนไขแสดงเหมือนกัน
ทุกประการ (มี `existingDocument` และไม่ได้กำลังอัปโหลดอยู่) — เป็น native `<a>` เปิดแท็บใหม่ ไม่ใช่
`Button` + `onClick` + `window.open` เพื่อให้ผู้ใช้คลิกขวา "เปิดในแท็บใหม่"/copy link ได้แบบลิงก์ปกติด้วย:

```tsx
{existingDocument && !updateVendorDocumentMutation.isPending && (
  <Button
    render={
      <a
        href={getVendorDocumentViewUrl(existingDocument.id)}
        target="_blank"
        rel="noopener noreferrer"
      />
    }
    nativeButton={false}
    type="button"
    variant="ghost"
    size="icon"
    aria-label="ดูไฟล์"
    className="shrink-0"
  >
    <Eye />
  </Button>
)}
{existingDocument && !updateVendorDocumentMutation.isPending && (
  <DeleteDocumentDialog document={existingDocument} />
)}
```

Import เพิ่ม: `Eye` จาก `lucide-react`, `getVendorDocumentViewUrl` จาก `@/lib/vendor/api`

`Button`'s `render` prop pattern (native `<a>`, `nativeButton={false}`) มิเรอร์การใช้งานเดิมใน
`AuthControl` (`components/navbar.tsx`) ที่ใช้ `render={<Link .../>}` — ต่างกันแค่ใช้ `<a>` เพราะเป็น URL
ไปยัง backend คนละ origin ไม่ใช่ Next.js internal route ที่ใช้ `Link` ได้

## Out of scope

- Preview แบบ modal ในหน้าเว็บเอง (เปิดแท็บใหม่พอ ตามที่ตกลงกันไว้)
- ปุ่มดูไฟล์ตอน `selectedFile` ยังอัปโหลดไม่เสร็จ (ยังไม่มี `id` จาก backend ให้ดู เหมือนเงื่อนไขเดิมของปุ่มลบ)

## Testing

ไม่มี test runner ในโปรเจกต์นี้ (ตาม spec เดิมทุกอัน) verify ด้วยมือ:
1. อัปโหลดเอกสาร PDF → กด "ดูไฟล์" → แท็บใหม่เปิดขึ้นมาแสดง PDF (ไม่ force download)
2. อัปโหลดเอกสารเป็นรูปภาพ (jpg/png) → กด "ดูไฟล์" → แท็บใหม่แสดงรูปภาพ
3. แถวที่ยังไม่มีเอกสาร ("ยังไม่มีเอกสาร") → ไม่มีปุ่ม "ดูไฟล์" แสดง
4. เช็คทั้ง light/dark mode ของปุ่มใหม่
