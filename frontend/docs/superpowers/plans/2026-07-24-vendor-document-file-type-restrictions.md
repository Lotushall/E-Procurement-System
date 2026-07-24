# Vendor Document File-Type Restrictions (Frontend Only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict which file types each vendor-document checklist row accepts — PDF-only by default, image-only (JPG/JPEG/PNG) for the two ID-card-style entries — enforced client-side via the file picker's `accept` attribute plus a post-selection extension check with an error toast.

**Architecture:** `app/(public)/profiles/data/document-types.ts` gains a `FileKind` type, a `FILE_KIND_CONFIG` lookup (accept string + allowed extensions + Thai error message per kind), and a `fileKind` field on every `REQUIRED_DOCUMENTS` entry. `document/page.tsx` threads `doc.fileKind` down as a new prop. `document-row.tsx` uses it to set the `<input accept>` attribute and to reject a mismatched file before it ever reaches the upload mutation.

**Tech Stack:** Next.js 16, React 19, TypeScript 5 (strict), sonner (toast). No test runner configured in this repo — verification is `tsc --noEmit`, `eslint`, `next build`, and manual checks via `npm run dev`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-vendor-document-file-type-restrictions-design.md`.
- No backend changes — `SaveVendorDocumentRequest` keeps validating `mimes:pdf,jpg,jpeg,png` for every `documentType` uniformly; per-type backend enforcement is a separate, later plan (explicit user decision).
- Exact per-key `fileKind` mapping (do not deviate): `company_certificate`=pdf, `authorized_person_id`=image, `vat_registration` (both company and individual arrays)=pdf, `shareholder_list`=pdf, `financial_statement`=pdf, `citizen_id`=image, `house_registration`=image, `commercial_registration`=pdf.
- Validation is filename-extension-based only (`file.name.toLowerCase().endsWith(ext)`) — no MIME-type/content sniffing, matching how the `accept` attribute and the backend's `mimes` rule already work from the client's perspective.
- The extension check happens synchronously in `handleChange`, before `setSelectedFile` and before `updateVendorDocumentMutation.mutateAsync` are called — an invalid file must never enter component state or reach the network.
- Use `toast.error(...)` (not `toast.promise`) for the invalid-file case — there's no async operation to track, and `toast.error` is already an established pattern elsewhere in this codebase (e.g. `app/(auth)/login/_hooks/use-login-form.ts`).
- `document-row.tsx` imports `FileKind`/`FILE_KIND_CONFIG` via the relative path `../../data/document-types` (it lives at `app/(public)/profiles/document/_components/`, two levels below `app/(public)/profiles/data/`) — matching `document/page.tsx`'s existing relative import of `REQUIRED_DOCUMENTS` from `../data/document-types`. Do not use the `@/` alias for this import.
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Baseline: 8 pre-existing, unrelated errors (`app/(auth)/reset-password/...` x2, `lib/auth/permissions.ts` x6) — confirm no *new* errors.
- Verify lint with `npm run lint` from `frontend/`. Baseline: 8 pre-existing, unrelated errors (`react/no-unescaped-entities` in `components/legal/privacy-content.tsx` and `components/legal/terms-content.tsx`) — confirm no new errors.
- File paths below are relative to `frontend/` (repo root `D:\E-Procurement-System`, `frontend/`/`backend/` are siblings).

---

### Task 1: Add `FileKind`/`FILE_KIND_CONFIG` and tag every document entry

**Files:**
- Modify: `app/(public)/profiles/data/document-types.ts`

**Interfaces:**
- Produces (used by Task 2): `export type FileKind = "pdf" | "image"`, `export const FILE_KIND_CONFIG: Record<FileKind, { accept: string; extensions: string[]; errorMessage: string }>`, and `RequiredDocument` gaining a required `fileKind: FileKind` field (so every existing `REQUIRED_DOCUMENTS` entry must be updated in the same change or the file won't compile).

- [ ] **Step 1: Replace the file contents**

Current `app/(public)/profiles/data/document-types.ts`:

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

Replace the full file with:

```ts
export type FileKind = "pdf" | "image";

export const FILE_KIND_CONFIG: Record<FileKind, {
  accept: string;
  extensions: string[];
  errorMessage: string;
}> = {
  pdf: {
    accept: ".pdf",
    extensions: [".pdf"],
    errorMessage: "ไฟล์ต้องเป็น PDF เท่านั้น",
  },
  image: {
    accept: ".jpg,.jpeg,.png",
    extensions: [".jpg", ".jpeg", ".png"],
    errorMessage: "ไฟล์ต้องเป็นรูปภาพ (JPG, JPEG, PNG) เท่านั้น",
  },
};

export type RequiredDocument = {
  key: string;
  label: string;
  required: boolean;
  fileKind: FileKind;
};

export const REQUIRED_DOCUMENTS: Record<"company" | "individual", RequiredDocument[]> = {
  company: [
    { key: "company_certificate", label: "หนังสือรับรองบริษัท", required: true, fileKind: "pdf" },
    { key: "authorized_person_id", label: "สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ", required: true, fileKind: "image" },
    { key: "vat_registration", label: "ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20)", required: true, fileKind: "pdf" },
    { key: "shareholder_list", label: "บัญชีรายชื่อผู้ถือหุ้น (บอจ.5)", required: true, fileKind: "pdf" },
    { key: "financial_statement", label: "งบการเงิน / หนังสือรับรองฐานะการเงิน", required: true, fileKind: "pdf" },
  ],
  individual: [
    { key: "citizen_id", label: "สำเนาบัตรประชาชน", required: true, fileKind: "image" },
    { key: "house_registration", label: "สำเนาทะเบียนบ้าน", required: true, fileKind: "image" },
    { key: "commercial_registration", label: "ทะเบียนพาณิชย์ (ถ้ามี)", required: false, fileKind: "pdf" },
    { key: "vat_registration", label: "ใบทะเบียนภาษีมูลค่าเพิ่ม (ถ้ามี)", required: false, fileKind: "pdf" },
  ],
};
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: at this point in the plan, `document/page.tsx` still constructs `<DocumentRow>` without a `fileKind` prop and `document-row.tsx` doesn't accept one yet, so this step's own file (`document-types.ts`) type-checks cleanly in isolation, but the *whole project* check will show the same 8 pre-existing baseline errors — `document-types.ts`'s new `fileKind` field is unused by any consumer yet, which is not a type error (unused object properties are not flagged by `tsc`). Confirm no new errors appear.

- [ ] **Step 3: Commit**

```bash
git add "app/(public)/profiles/data/document-types.ts"
git commit -m "feat(vendor): add per-document-type file-kind config"
```

---

### Task 2: Enforce file kind in `DocumentRow` and thread it from `page.tsx`

**Files:**
- Modify: `app/(public)/profiles/document/page.tsx`
- Modify: `app/(public)/profiles/document/_components/document-row.tsx`

**Interfaces:**
- Consumes: `FileKind`, `FILE_KIND_CONFIG` from Task 1 (`../../data/document-types` relative to `document-row.tsx`; `../data/document-types` relative to `page.tsx`).

- [ ] **Step 1: Thread `fileKind` through `page.tsx`**

Current `app/(public)/profiles/document/page.tsx`:

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
                            existingDocument={vendor.document?.find((d) => d.documentType === doc.key)}
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

Change only the `<DocumentRow>` call (add one prop line):

```tsx
                        <DocumentRow
                            key={doc.key}
                            documentType={doc.key}
                            label={doc.label}
                            required={doc.required}
                            fileKind={doc.fileKind}
                            existingDocument={vendor.document?.find((d) => d.documentType === doc.key)}
                        />
```

Nothing else in this file changes.

- [ ] **Step 2: Replace `document-row.tsx`**

Current `app/(public)/profiles/document/_components/document-row.tsx`:

```tsx
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VendorDocument } from "@/lib/vendor/types";
import { FileText, Paperclip } from "lucide-react";
import { useSaveVendorDocument } from "@/lib/vendor/mutations";
import DeleteDocumentDialog from "./delete-document-dialog";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "อัปโหลดเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  approved: { label: "อนุมัติแล้ว", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  rejected: { label: "ถูกปฏิเสธ", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

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
  const updateVendorDocumentMutation = useSaveVendorDocument();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setSelectedFile(file);

    toast.promise(updateVendorDocumentMutation.mutateAsync({ documentType, file }), {
      loading: "กำลังอัปโหลดเอกสาร...",
      success: () => {
        setSelectedFile(null);
        return "อัปโหลดเอกสารสำเร็จ";
      },
      error: (error) => {
        setSelectedFile(null);
        return getErrorMessage(error);
      },
    });
  };

  const fileName = selectedFile?.name ?? existingDocument?.fileName;
  const fileSize = selectedFile ? formatFileSize(selectedFile.size) : undefined;
  const status = selectedFile ? STATUS_STYLE.pending : (existingDocument && STATUS_STYLE[existingDocument.status]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-md">
      <div className="flex items-center gap-2 md:gap-3.5 min-w-0 flex-1">
        <div className="flex items-center justify-center shrink-0 w-11 h-11 rounded-md bg-gray-200 text-gray-600">
          <FileText size={20} />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-col-reverse md:flex-row md:items-center gap-1 md:gap-2.5">
            <p className="font-bold tracking-wide">{label}</p>

            <div className="flex flex-row justify-start items-center md:flex-row gap-1">
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
          </div>
          <p className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal">
            {fileName ? (
              <>
                {fileName}
                {fileSize && ` · ${fileSize}`}
              </>
            ) : (
              "ยังไม่มีเอกสาร"
            )}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex items-center justify-end gap-2 sm:shrink-0">
        <Button
          type="button"
          variant="outline"
          disabled={updateVendorDocumentMutation.isPending}
          onClick={() => inputRef.current?.click()}
          className="flex-1 shrink h-11"
        >
          <Paperclip />
          {fileName ? "เปลี่ยนไฟล์" : "แนบไฟล์"}
        </Button>

        {existingDocument && !updateVendorDocumentMutation.isPending && (
          <DeleteDocumentDialog document={existingDocument} />
        )}
      </div>
    </div>
  );
}
```

Replace the full file with:

```tsx
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VendorDocument } from "@/lib/vendor/types";
import { FileText, Paperclip } from "lucide-react";
import { useSaveVendorDocument } from "@/lib/vendor/mutations";
import DeleteDocumentDialog from "./delete-document-dialog";
import { FILE_KIND_CONFIG, type FileKind } from "../../data/document-types";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "อัปโหลดเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  approved: { label: "อนุมัติแล้ว", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  rejected: { label: "ถูกปฏิเสธ", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function DocumentRow({
  documentType,
  label,
  required,
  fileKind,
  existingDocument,
}: {
  documentType: string;
  label: string;
  required: boolean;
  fileKind: FileKind;
  existingDocument?: VendorDocument;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateVendorDocumentMutation = useSaveVendorDocument();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const kindConfig = FILE_KIND_CONFIG[fileKind];
    const hasAllowedExtension = kindConfig.extensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    if (!hasAllowedExtension) {
      toast.error(kindConfig.errorMessage);
      return;
    }

    setSelectedFile(file);

    toast.promise(updateVendorDocumentMutation.mutateAsync({ documentType, file }), {
      loading: "กำลังอัปโหลดเอกสาร...",
      success: () => {
        setSelectedFile(null);
        return "อัปโหลดเอกสารสำเร็จ";
      },
      error: (error) => {
        setSelectedFile(null);
        return getErrorMessage(error);
      },
    });
  };

  const fileName = selectedFile?.name ?? existingDocument?.fileName;
  const fileSize = selectedFile ? formatFileSize(selectedFile.size) : undefined;
  const status = selectedFile ? STATUS_STYLE.pending : (existingDocument && STATUS_STYLE[existingDocument.status]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-md">
      <div className="flex items-center gap-2 md:gap-3.5 min-w-0 flex-1">
        <div className="flex items-center justify-center shrink-0 w-11 h-11 rounded-md bg-gray-200 text-gray-600">
          <FileText size={20} />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-col-reverse md:flex-row md:items-center gap-1 md:gap-2.5">
            <p className="font-bold tracking-wide">{label}</p>

            <div className="flex flex-row justify-start items-center md:flex-row gap-1">
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
          </div>
          <p className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal">
            {fileName ? (
              <>
                {fileName}
                {fileSize && ` · ${fileSize}`}
              </>
            ) : (
              "ยังไม่มีเอกสาร"
            )}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={FILE_KIND_CONFIG[fileKind].accept}
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex items-center justify-end gap-2 sm:shrink-0">
        <Button
          type="button"
          variant="outline"
          disabled={updateVendorDocumentMutation.isPending}
          onClick={() => inputRef.current?.click()}
          className="flex-1 shrink h-11"
        >
          <Paperclip />
          {fileName ? "เปลี่ยนไฟล์" : "แนบไฟล์"}
        </Button>

        {existingDocument && !updateVendorDocumentMutation.isPending && (
          <DeleteDocumentDialog document={existingDocument} />
        )}
      </div>
    </div>
  );
}
```

Note what changed from before: new import of `FILE_KIND_CONFIG`/`FileKind` from `../../data/document-types`, new `fileKind: FileKind` prop, the extension-check block at the top of `handleChange` (returns early with `toast.error` on mismatch, before `setSelectedFile`/`mutateAsync`), and `accept={FILE_KIND_CONFIG[fileKind].accept}` replacing the hardcoded string on the `<input>`. Everything else (delete-dialog gating, badges, file-size formatting, JSX structure) is byte-for-byte unchanged.

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing errors as the Task 1 baseline, nothing new. This is the point where a missing/mistyped `fileKind` prop on either end would surface as a new error — confirm it doesn't.

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing errors as baseline, nothing new from either touched file.

- [ ] **Step 5: Build**

Run (from `frontend/`): `npm run build`
Expected: Turbopack's compile phase succeeds (this is real evidence the change bundles correctly); the overall command still exits non-zero solely because of the pre-existing, unrelated `reset-password-view.tsx` TypeScript error during the build's type-check phase — that's a pre-existing condition (present before this plan), not a regression this plan introduced. Report the compile-phase result explicitly.

- [ ] **Step 6: Manual verification**

If you have `npm run dev` running and browser access, verify: company vendor's "หนังสือรับรองบริษัท" row's file picker only offers `.pdf`, and picking a `.png` there (e.g. via drag-and-drop, which bypasses the `accept` filter) shows the "ไฟล์ต้องเป็น PDF เท่านั้น" toast without starting an upload; "สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ" only offers image extensions and rejects a `.pdf` the same way. If you do not have browser access in your environment, skip this step and say so explicitly in your report — do not fabricate a result.

- [ ] **Step 7: Commit**

```bash
git add "app/(public)/profiles/document/page.tsx" "app/(public)/profiles/document/_components/document-row.tsx"
git commit -m "feat(vendor): enforce per-document-type file kind on upload"
```
