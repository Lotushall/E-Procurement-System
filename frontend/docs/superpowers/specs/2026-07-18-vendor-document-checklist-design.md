# Vendor Document Checklist (Vendor Document Page)

## Context

`app/(public)/profiles/document/page.tsx` renders the "เอกสารประกอบการขึ้นทะเบียน" tab but is currently a stub — the loaded/loading branches both render `<></>`. `VendorDocument` (`lib/vendor/types.ts:35-43`) already models a per-document record (`documentType`, `fileName`, `filePath`, `status`, `verifiedBy`, `verifiedAt`, `remark`), and `VendorProfile.document` is `VendorDocument[]`, but nothing in the frontend yet defines *which* document types a vendor must submit.

The backend has no document-upload endpoint yet (no `upload`/`FormData`/multipart usage anywhere in the repo, confirmed by search), matching the state of the contact feature before `AddContactDialog` was built (`docs/superpowers/specs/2026-07-17-vendor-contact-add-dialog-design.md`): this task builds the **checklist UI only**, with an optimistic local-state placeholder standing in for the real upload call, which is separate future work.

Required documents differ by vendor type (`vendor.detail.type`, `"company" | "individual"` — `lib/vendor/types.ts:54-56`), the same split already used throughout `profiles/page.tsx`.

Status colors/labels for `pending` / `approved` / `rejected` follow the existing convention in `app/(public)/profiles/_components/navbar.tsx:16-32` (`VENDER_STATUS_TYPE`) — yellow/green/red — reused (not extracted into a shared util; that file is out of scope for this change) as a local map inside the new document row component.

`sidebar.tsx`'s `hasIncompleteDocument` currently only checks `vendor.document.length === 0` (a leftover from before `document` was array-shaped). This task upgrades it to check that every *required* document type for the vendor's type has a matching upload.

## Part 1: `app/(public)/profiles/data/document-types.ts` (new)

Mirrors the existing `app/(public)/profiles/data/business-types.ts` data-file convention.

```ts
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

`key` is a frontend-only slug for now (there's no backend contract for `documentType` values yet); it's what gets matched against `VendorDocument.documentType` once a real upload exists, and is passed as the placeholder payload's `documentType` in the meantime.

`required: false` entries (`commercial_registration`, `vat_registration` for individuals) still render in the checklist so a vendor *can* attach them, but they never block completeness — this is what keeps `sidebar.tsx`'s warning honest for individual vendors who don't have a shop registration or aren't VAT-registered.

## Part 2: `app/(public)/profiles/document/_components/document-row.tsx` (new)

One row per required-document entry. Self-contained: owns its own "currently selected file this session" state and its own hidden file input, so `document/page.tsx` doesn't need to track upload state for every row.

```tsx
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

Selecting a file is the entire interaction — no confirm dialog, no separate save step. It immediately becomes the row's displayed state (optimistic) and is logged as a stand-in for the future upload call, same placeholder pattern as `useAddContactForm`'s `console.log(values)`.

`STATUS_STYLE` is a local copy of the same three-status color convention as `navbar.tsx`'s `VENDER_STATUS_TYPE`; not extracted into a shared util since `navbar.tsx` isn't otherwise touched by this change. Unlike `VENDER_STATUS_TYPE` (keyed by the literal union `VendorProfile["verificationStatus"]`), `STATUS_STYLE` is keyed by plain `Record<string, ...>` because `VendorDocument["status"]` (`lib/vendor/types.ts:39`) is typed as a loose `string`, not a literal union — that's a pre-existing looseness in the type, not something this task changes. An unrecognized status value simply renders no badge (`status &&` guard in the JSX), which is safe but silent; tightening `VendorDocument["status"]` to a literal union is a good follow-up once the real upload/verification endpoint defines its actual status vocabulary.

## Part 3: `document/page.tsx` change

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

Matches the loading/empty-state convention already used in `profiles/page.tsx` (`Spinner` in a centered fixed-height box) rather than the bare `Loading` text currently in the stub.

## Part 4: `sidebar.tsx` change

```ts
import { REQUIRED_DOCUMENTS } from "../data/document-types";
// ...
const hasIncompleteDocument =
    !isPending &&
    (
        !vendor ||
        REQUIRED_DOCUMENTS[vendor.detail.type]
            .filter((d) => d.required)
            .some((d) => !vendor.document?.some((doc) => doc.documentType === d.key))
    );
```

Replaces the current `!vendor.document || vendor.document.length === 0` check. This is the only change to `sidebar.tsx` in this task — `hasIncompleteContact` (already array-aware) and `hasIncompleteAddress` are untouched.

## Error Handling

Purely client-side. No network errors to handle since there is no request yet (same as the contact dialog). The file `<input>`'s native `accept` attribute is an advisory filter only, not a validation layer — browsers permit users to override it, but with no backend to enforce a hard rule against yet, that's out of scope for this pass.

## Out of scope (explicitly deferred)

- Real upload endpoint / mutation (swap `console.log` for a `useMutation`, same follow-up note as the contact dialog).
- Client-side file size/type validation beyond the `accept` filter.
- Multiple files per document type — each checklist slot holds exactly one current file, consistent with the fixed-checklist UI decision.
- Extracting `STATUS_STYLE`/`VENDER_STATUS_TYPE` into a shared util — both stay local copies until a third consumer appears.

## Testing

No test runner is configured in this repo (consistent with prior frontend specs). Verification is manual: open the document tab as a company vendor (5 required rows, all "ยังไม่มีเอกสาร"), as an individual vendor (2 required + 2 "ไม่บังคับ" rows), attach a file to a row (row updates immediately to show the file name and a "รอตรวจสอบ" badge, console logs the payload), replace it with another file (row updates again), and confirm the sidebar's "เอกสารประกอบ" warning dot disappears once every *required* row has a file — check both light and dark mode.
