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

แทนที่จะเพิ่มปุ่มแยก ให้ตัว label (ชื่อประเภทเอกสาร) กับชื่อไฟล์ที่แสดงอยู่แล้วเป็นลิงก์กดดูไฟล์ได้เลย
(ตัดสินใจเปลี่ยนจากดราฟต์แรกที่ใช้ปุ่มไอคอน `Eye` แยก) เงื่อนไขแสดงเป็นลิงก์: มี `existingDocument` และ
ไม่ได้กำลังอัปโหลดอยู่ (`!updateVendorDocumentMutation.isPending`) — เหมือนเงื่อนไขเดิมของปุ่มลบ ไม่งั้น
render เป็น `<p>` ธรรมดาเหมือนเดิม (ไม่มีอะไรให้ดู):

```tsx
const viewUrl =
  existingDocument && !updateVendorDocumentMutation.isPending
    ? getVendorDocumentViewUrl(existingDocument.id)
    : undefined;

// label:
{viewUrl ? (
  <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="font-bold tracking-wide hover:underline">
    {label}
  </a>
) : (
  <p className="font-bold tracking-wide">{label}</p>
)}

// ชื่อไฟล์:
{viewUrl ? (
  <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal hover:underline">
    {fileName}
    {fileSize && ` · ${fileSize}`}
  </a>
) : (
  <p className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal">
    {fileName ?? "ยังไม่มีเอกสาร"}
  </p>
)}
```

Import เพิ่มแค่ `getVendorDocumentViewUrl` จาก `@/lib/vendor/api` (ไม่ต้องมี `Eye`/`Button` render-prop
เพิ่มแล้ว) native `<a>` เปิดแท็บใหม่ (ไม่ใช้ `window.open`) เพื่อให้ผู้ใช้คลิกขวา "เปิดในแท็บใหม่"/copy
link ได้แบบลิงก์ปกติด้วย

## Out of scope

- Preview แบบ modal ในหน้าเว็บเอง (เปิดแท็บใหม่พอ ตามที่ตกลงกันไว้)
- ลิงก์ดูไฟล์ตอน `selectedFile` ยังอัปโหลดไม่เสร็จ (ยังไม่มี `id` จาก backend ให้ดู เหมือนเงื่อนไขเดิมของ
  ปุ่มลบ) — ตอนนั้น label/ชื่อไฟล์ยัง render เป็น `<p>` ธรรมดา ไม่ใช่ลิงก์

## Testing

ไม่มี test runner ในโปรเจกต์นี้ (ตาม spec เดิมทุกอัน) verify ด้วยมือ:
1. อัปโหลดเอกสาร PDF → กด "ดูไฟล์" → แท็บใหม่เปิดขึ้นมาแสดง PDF (ไม่ force download)
2. อัปโหลดเอกสารเป็นรูปภาพ (jpg/png) → กด "ดูไฟล์" → แท็บใหม่แสดงรูปภาพ
3. แถวที่ยังไม่มีเอกสาร ("ยังไม่มีเอกสาร") → ไม่มีปุ่ม "ดูไฟล์" แสดง
4. เช็คทั้ง light/dark mode ของปุ่มใหม่
