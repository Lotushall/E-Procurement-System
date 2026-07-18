# Vendor Document Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty stub in the vendor "เอกสารประกอบการขึ้นทะเบียน" (document) tab with a fixed checklist of required document types — different lists for `company` vs `individual` vendors — where each row lets the vendor pick a file directly (no confirm dialog). Update the sidebar's document-warning check to require every *required* document type instead of just "at least one file."

**Architecture:** A new data file (`data/document-types.ts`) declares the per-vendor-type required-document list (`key`, `label`, `required`), mirroring the existing `data/business-types.ts` convention. A new self-contained row component (`document/_components/document-row.tsx`) owns its own "selected file this session" state and hidden `<input type="file">`, deriving a status badge from either that local selection (optimistic "pending") or a matching `VendorDocument` already on the vendor. `document/page.tsx` maps the required list for the vendor's type into rows. `sidebar.tsx`'s `hasIncompleteDocument` is updated to check that every required `key` has a matching `documentType` in `vendor.document`. No backend upload endpoint exists yet, so selecting a file only updates local component state and logs a placeholder payload — the same UI-only stage `AddContactDialog` is in.

**Tech Stack:** Next.js (App Router, client components), Tailwind v4, existing `components/ui/badge.tsx` and `components/ui/button.tsx`, `lucide-react` icons. No new dependencies.

## Global Constraints

- No test runner is configured in this repo (`package.json` has no vitest/jest/playwright, no `*.test.ts` files exist). Do not add a test framework. Verification is `npx tsc --noEmit`, `npm run lint`, and manual browser checks via the dev server.
- No backend endpoint exists for uploading a document. Do not add an API call or `useMutation`. A file selection only sets local component state and calls `console.log({ documentType, file })` as a placeholder side effect — same convention as `useAddContactForm`'s `console.log(values)`.
- Required document lists (exact `key`/`label`/`required` values, do not change without re-confirming with the user):
  - `company`: `company_certificate` (หนังสือรับรองบริษัท, required), `authorized_person_id` (สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ, required), `vat_registration` (ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20), required), `shareholder_list` (บัญชีรายชื่อผู้ถือหุ้น (บอจ.5), required), `financial_statement` (งบการเงิน / หนังสือรับรองฐานะการเงิน, required).
  - `individual`: `citizen_id` (สำเนาบัตรประชาชน, required), `house_registration` (สำเนาทะเบียนบ้าน, required), `commercial_registration` (ทะเบียนพาณิชย์ (ถ้ามี), optional), `vat_registration` (ใบทะเบียนภาษีมูลค่าเพิ่ม (ถ้ามี), optional).
- Each checklist row holds exactly one current file — no multi-file-per-type support in this pass.
- Status colors reuse the existing pending=yellow / approved=green / rejected=red convention from `app/(public)/profiles/_components/navbar.tsx:16-32`, but as a local copy (do not import from or modify `navbar.tsx` — out of scope for this change).

---

### Task 1: Required document data file

**Files:**
- Create: `app/(public)/profiles/data/document-types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 3 and 4):
  - `RequiredDocument` — type `{ key: string; label: string; required: boolean }`.
  - `REQUIRED_DOCUMENTS` — `Record<"company" | "individual", RequiredDocument[]>` with the exact entries listed in Global Constraints above.

- [ ] **Step 1: Write the data file**

```ts
// app/(public)/profiles/data/document-types.ts
export type RequiredDocument = { key: string; label: string; required: boolean };

export const REQUIRED_DOCUMENTS: Record<"company" | "individual", RequiredDocument[]> = {
  company: [
    { key: "company_certificate", label: "หนังสือรับรองบริษัท", required: true },
    { key: "authorized_person_id", label: "สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ", required: true },
    { key: "vat_registration", label: "ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20)", required: true },
    { key: "shareholder_list", label: "บัญชีรายชื่อผู้ถือหุ้น (บอจ.5)", required: true },
    { key: "financial_statement", label: "งบการเงิน / หนังสือรับรองฐานะการเงิน", required: true },
  ],
  individual: [
    { key: "citizen_id", label: "สำเนาบัตรประชาชน", required: true },
    { key: "house_registration", label: "สำเนาทะเบียนบ้าน", required: true },
    { key: "commercial_registration", label: "ทะเบียนพาณิชย์ (ถ้ามี)", required: false },
    { key: "vat_registration", label: "ใบทะเบียนภาษีมูลค่าเพิ่ม (ถ้ามี)", required: false },
  ],
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/data/document-types.ts`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/data/document-types.ts"
git commit -m "feat(vendor): add required document type list"
```

---

### Task 2: Document checklist row component

**Files:**
- Create: `app/(public)/profiles/document/_components/document-row.tsx`

**Interfaces:**
- Consumes: `VendorDocument` type from `@/lib/vendor/types` (existing, unchanged — fields `documentType: string`, `fileName: string`, `status: string`, plus others not used here); `Badge` from `@/components/ui/badge`; `Button` from `@/components/ui/button`; `cn` from `@/lib/utils`; `FileText`, `Paperclip` icons from `lucide-react`.
- Produces (used by Task 3): default export `DocumentRow` — props `{ documentType: string; label: string; required: boolean; existingDocument?: VendorDocument }`.

- [ ] **Step 1: Write the component file**

```tsx
// app/(public)/profiles/document/_components/document-row.tsx
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VendorDocument } from "@/lib/vendor/types";
import { FileText, Paperclip } from "lucide-react";

const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  approved: { label: "อนุมัติแล้ว", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  rejected: { label: "ถูกปฏิเสธ", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
};

export default function DocumentRow({
  documentType,
  label,
  required,
  existingDocument,
}: {
  documentType: string;
  label: string;
  required: boolean;
  existingDocument?: VendorDocument;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log({ documentType, file });
    setSelectedFile(file);
    e.target.value = "";
  };

  const fileName = selectedFile?.name ?? existingDocument?.fileName;
  const status = selectedFile ? STATUS_STYLE.pending : (existingDocument && STATUS_STYLE[existingDocument.status]);

  return (
    <div className="flex items-center gap-3.5 p-4 border rounded-md">
      <div className="flex items-center justify-center w-11 h-11 rounded-md bg-gray-200 text-gray-600">
        <FileText size={20} />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <p className="font-bold tracking-wide">{label}</p>
          {!required && (
            <Badge className="bg-gray-100 text-gray-600 tracking-wider">ไม่บังคับ</Badge>
          )}
          {status && (
            <Badge className={cn("tracking-wider", status.badge)}>
              <span className={cn("w-1.75 h-1.75 rounded-full", status.dot)} />
              {status.label}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600 font-thin tracking-wide truncate">
          {fileName ?? "ยังไม่มีเอกสาร"}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="shrink-0"
      >
        <Paperclip />
        {fileName ? "เปลี่ยนไฟล์" : "แนบไฟล์"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/document/_components/document-row.tsx`. If `existingDocument.status` indexing into `STATUS_STYLE` reports a type error, confirm `VendorDocument["status"]` is still `string` in `lib/vendor/types.ts` (it is as of this plan) — `Record<string, ...>` indexing by a plain `string` should typecheck without a cast.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/document/_components/document-row.tsx"
git commit -m "feat(vendor): add DocumentRow checklist component"
```

---

### Task 3: Wire the checklist into the document page

**Files:**
- Modify: `app/(public)/profiles/document/page.tsx`

**Interfaces:**
- Consumes: `REQUIRED_DOCUMENTS` from `../data/document-types` (Task 1); `DocumentRow` default export from `./_components/document-row` (Task 2); `Spinner` from `@/components/ui/spinner` (existing, unchanged, already used the same way in `app/(public)/profiles/page.tsx`).

- [ ] **Step 1: Replace the stub with the checklist**

Current file (as of this plan — it may have picked up unrelated local scaffolding such as a stray `console.log(vendor)`; replace the whole file body with the version below regardless of what's currently there):

```tsx
"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import SectionTitle from "../_components/section-title";

export default function Document() {
    const { data: vendor, isLoading } = useVendorProfile();

    return (
        <div className="flex flex-col">
            <SectionTitle title="เอกสารประกอบการขึ้นทะเบียน" desc="เอกสารเหล่านี้จะถูกส่งให้เจ้าหน้าที่ตรวจสอบและอนุมัติ" />
        </div>
    )
}
```

Replace with:

```tsx
"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import SectionTitle from "../_components/section-title";
import DocumentRow from "./_components/document-row";
import { REQUIRED_DOCUMENTS } from "../data/document-types";
import { Spinner } from "@/components/ui/spinner";

export default function Document() {
    const { data: vendor, isLoading } = useVendorProfile();

    return (
        <div className="flex flex-col">
            <SectionTitle title="เอกสารประกอบการขึ้นทะเบียน" desc="เอกสารเหล่านี้จะถูกส่งให้เจ้าหน้าที่ตรวจสอบและอนุมัติ" />

            {vendor && !isLoading ? (
                <div className="flex flex-col gap-2">
                    {REQUIRED_DOCUMENTS[vendor.detail.type].map((doc) => (
                        <DocumentRow
                            key={doc.key}
                            documentType={doc.key}
                            label={doc.label}
                            required={doc.required}
                            existingDocument={vendor.document.find((d) => d.documentType === doc.key)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex justify-center items-center h-70">
                    <Spinner className="size-8" />
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/document/page.tsx`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`, navigate to the "เอกสารประกอบ" tab of the vendor profile section while logged in as a vendor.

Verify:
1. If the logged-in vendor's `detail.type` is `company`: 5 rows render (หนังสือรับรองบริษัท, สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ, ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20), บัญชีรายชื่อผู้ถือหุ้น (บอจ.5), งบการเงิน / หนังสือรับรองฐานะการเงิน), none show a "ไม่บังคับ" badge.
2. If `individual`: 4 rows render, and the last two (ทะเบียนพาณิชย์, ใบทะเบียนภาษีมูลค่าเพิ่ม) show a gray "ไม่บังคับ" badge.
3. Any row with no matching `vendor.document` entry shows "ยังไม่มีเอกสาร" and a "แนบไฟล์" button, no status badge.
4. Clicking "แนบไฟล์" opens the OS file picker; selecting a file immediately updates that row to show the file's name, a yellow "รอตรวจสอบ" badge, and the button now reads "เปลี่ยนไฟล์" — check the browser console for the logged `{ documentType, file }` payload.
5. Selecting a different file on the same row replaces the shown file name (still "รอตรวจสอบ").
6. Other rows are unaffected by a selection in one row.
7. Toggle light/dark mode and confirm the checklist rows, badges, and buttons render legibly in both.

Expected: All seven checks pass with no console errors (other than the intentional logged payload from step 4).

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/profiles/document/page.tsx"
git commit -m "feat(vendor): wire document checklist into document page"
```

---

### Task 4: Update sidebar document-completeness check

**Files:**
- Modify: `app/(public)/profiles/_components/sidebar.tsx`

**Interfaces:**
- Consumes: `REQUIRED_DOCUMENTS` from `../data/document-types` (Task 1).

- [ ] **Step 1: Replace the document-completeness check**

Current file:

```tsx
"use client";

import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import { Building2, FileText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname();
    const { data: vendor, isPending } = useVendorProfile();

    const hasIncompleteAddress =
        !isPending &&
        (
            !vendor ||
            !vendor.detail.address ||
            !vendor.detail.country ||
            !vendor.detail.province ||
            !vendor.detail.postalCode
        );

    const hasIncompleteContact =
        !isPending &&
        (
            !vendor ||
            !vendor.contact ||
            vendor.contact.length === 0 ||
            !vendor.contact?.[0]?.contactName ||
            !vendor.contact?.[0]?.contactEmail ||
            !vendor.contact?.[0]?.contactPhone
        );

    const hasIncompleteDocument =
        !isPending &&
        (
            !vendor ||
            !vendor.document ||
            vendor.document.length === 0
        );

    const menus = [
        {
            icon: <Building2 size={18} />,
            label: "ข้อมูลบริษัท",
            href: routes.profiles.profile,
            hasWarning: hasIncompleteAddress,
        },
        {
            icon: <Users size={18} />,
            label: "ผู้ติดต่อ",
            href: routes.profiles.contract,
            hasWarning: hasIncompleteContact,
        },
        {
            icon: <FileText size={18} />,
            label: "เอกสารประกอบ",
            href: routes.profiles.document,
            hasWarning: hasIncompleteDocument,
        },
    ];

    return (
        <div className="flex flex-col gap-0.5 bg-white border border-gray-200 shadow rounded-md p-2 max-w-58 w-full h-fit">
            {menus.map((menu, index) => {
                const isActive = pathname === menu.href;
                return (
                    <Link
                        href={menu.href}
                        key={index}
                        className={cn(
                            "flex items-center justify-start gap-2.5 px-3.5 py-2.5 rounded-md",
                            isActive && "text-red-700 bg-red-100",
                        )}
                    >
                        <span className="relative">
                            {menu.icon}
                            {menu.hasWarning && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.75 h-1.75 rounded-full bg-red-600" />
                            )}
                        </span>
                        <p className="text-sm font-semibold tracking-wider">{menu.label}</p>
                    </Link>
                )
            })}
        </div>
    )
}
```

Replace with:

```tsx
"use client";

import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import { REQUIRED_DOCUMENTS } from "../data/document-types";
import { Building2, FileText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname();
    const { data: vendor, isPending } = useVendorProfile();

    const hasIncompleteAddress =
        !isPending &&
        (
            !vendor ||
            !vendor.detail.address ||
            !vendor.detail.country ||
            !vendor.detail.province ||
            !vendor.detail.postalCode
        );

    const hasIncompleteContact =
        !isPending &&
        (
            !vendor ||
            !vendor.contact ||
            vendor.contact.length === 0 ||
            !vendor.contact?.[0]?.contactName ||
            !vendor.contact?.[0]?.contactEmail ||
            !vendor.contact?.[0]?.contactPhone
        );

    const hasIncompleteDocument =
        !isPending &&
        (
            !vendor ||
            REQUIRED_DOCUMENTS[vendor.detail.type]
                .filter((doc) => doc.required)
                .some((doc) => !vendor.document?.some((d) => d.documentType === doc.key))
        );

    const menus = [
        {
            icon: <Building2 size={18} />,
            label: "ข้อมูลบริษัท",
            href: routes.profiles.profile,
            hasWarning: hasIncompleteAddress,
        },
        {
            icon: <Users size={18} />,
            label: "ผู้ติดต่อ",
            href: routes.profiles.contract,
            hasWarning: hasIncompleteContact,
        },
        {
            icon: <FileText size={18} />,
            label: "เอกสารประกอบ",
            href: routes.profiles.document,
            hasWarning: hasIncompleteDocument,
        },
    ];

    return (
        <div className="flex flex-col gap-0.5 bg-white border border-gray-200 shadow rounded-md p-2 max-w-58 w-full h-fit">
            {menus.map((menu, index) => {
                const isActive = pathname === menu.href;
                return (
                    <Link
                        href={menu.href}
                        key={index}
                        className={cn(
                            "flex items-center justify-start gap-2.5 px-3.5 py-2.5 rounded-md",
                            isActive && "text-red-700 bg-red-100",
                        )}
                    >
                        <span className="relative">
                            {menu.icon}
                            {menu.hasWarning && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.75 h-1.75 rounded-full bg-red-600" />
                            )}
                        </span>
                        <p className="text-sm font-semibold tracking-wider">{menu.label}</p>
                    </Link>
                )
            })}
        </div>
    )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/_components/sidebar.tsx`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 4: Manual verification**

With the dev server running (`npm run dev`), log in as a vendor and check the sidebar's "เอกสารประกอบ" entry:
1. If that vendor's `vendor.document` (server data, not anything selected in the checklist this session) already contains every *required* `documentType` for their `detail.type`, no red warning dot shows.
2. If any required `documentType` is missing from `vendor.document`, the red warning dot shows.
3. Confirm attaching a file in a `DocumentRow` (Task 3) does **not** by itself change the dot — that's expected (no mutation writes it back to the query cache yet); don't treat this as a bug.

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/profiles/_components/sidebar.tsx"
git commit -m "feat(vendor): require all vendor document types in sidebar check"
```

---

## Self-Review Notes

- **Spec coverage:** Spec Part 1 (required document data) → Task 1. Part 2 (`DocumentRow`) → Task 2. Part 3 (`document/page.tsx` wiring) → Task 3. Part 4 (`sidebar.tsx` check) → Task 4. Spec's "Error Handling" section (client-side only, `accept` as advisory filter) → no dedicated task since there's no error state to build; reflected in Task 2's component having no error UI. Spec's "Out of scope" section (no mutation, no size validation, one-file-per-slot, no shared status util) → enforced via Global Constraints and by Tasks 1-4 not introducing any of those things. Spec's "Testing" section → Task 3 Step 4 (checklist interaction) and Task 4 Step 4 (sidebar logic, with the local-state-vs-query-cache caveat carried over verbatim).
- **Placeholder scan:** No TBD/TODO; every code block is complete and copy-pasteable; `console.log({ documentType, file })` is an explicit, spec-documented placeholder for the future upload call, not an unfinished step.
- **Type consistency:** `RequiredDocument`'s `key`/`label`/`required` fields (Task 1) match the props `DocumentRow` destructures as `documentType`/`label`/`required` (Task 2) and match how Task 3 spreads `doc.key`/`doc.label`/`doc.required` into `<DocumentRow>`. `DocumentRow`'s `existingDocument?: VendorDocument` prop (Task 2) matches the `vendor.document.find(...)` result passed in Task 3 (both `VendorDocument | undefined`). `REQUIRED_DOCUMENTS[vendor.detail.type]` is used identically in Task 3 (page) and Task 4 (sidebar) — both index by the same `"company" | "individual"` union already on `VendorProfileDetail["type"]`.
