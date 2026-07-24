# Vendor Contact/Document Delete (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the two already-stubbed delete flows — vendor contact delete and vendor document delete — to the real backend endpoints (`DELETE /api/v1/vendor/contact/{id}` and `DELETE /api/v1/vendor/document/{id}`, both already implemented and tested on the backend).

**Architecture:** Add `id` to the `VendorDocument` type, fix/extend `lib/vendor/api.ts`'s delete functions to take an id and hit the real routes, add matching `useMutation` hooks in `lib/vendor/mutations.ts`, then wire those hooks into the existing `DeleteContactDialog` (currently a `console.log` stub) and a new `DeleteDocumentDialog` (modeled on `DeleteContactDialog`) that replaces `DocumentRow`'s inline delete button.

**Tech Stack:** Next.js 16, React 19, TypeScript 5 (strict), TanStack Query 5, axios, sonner (toast), shadcn/ui `AlertDialog`. No test runner configured in this repo — verification is `tsc --noEmit`, `eslint`, and manual checks via `npm run dev`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-vendor-contact-document-delete-design.md`.
- No backend changes — both endpoints already exist, are tested, and are merged.
- `lib/vendor/api.ts`'s existing functions never wrap calls in try/catch (errors propagate to the caller) — new functions follow that same convention.
- Every mutation added to `lib/vendor/mutations.ts` invalidates `VENDOR_PROFILE_QUERY_KEY` on success, matching every existing mutation in that file.
- Both delete confirmations use `toast.promise` with a local `getErrorMessage(error)` helper (extract `error.response.data.message` via `isAxiosError`, fall back to a hardcoded Thai string) — this duplicates a few lines already duplicated in `use-add-contact-form.ts` and `document-row.tsx`; do not extract a shared util (out of scope per spec).
- Backend success/failure copy to match exactly: contact = `ลบข้อมูลผู้ติดต่อสำเร็จ` / `ลบข้อมูลผู้ติดต่อไม่สำเร็จ`; document = `ลบเอกสารสำเร็จ` / `ลบเอกสารไม่สำเร็จ`.
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Note: this repo has 8 pre-existing, unrelated TS errors (in `app/(auth)/reset-password/...` and `lib/auth/permissions.ts`) — these are not part of this work; only confirm no *new* errors appear (i.e. no errors mentioning `lib/vendor/` or the files this plan touches).
- Verify lint with `npm run lint` from `frontend/`. Note: this repo has 8 pre-existing, unrelated lint errors (`react/no-unescaped-entities` in `components/legal/privacy-content.tsx` and `components/legal/terms-content.tsx`) — not part of this work; only confirm no *new* errors appear from the files this plan touches.
- File paths below are relative to `frontend/` (repo root is `d:\E-Procurement-System\`, this plan's cwd is `frontend/`).

---

### Task 1: Add `id` to `VendorDocument` and fix the delete API functions

**Files:**
- Modify: `lib/vendor/types.ts`
- Modify: `lib/vendor/api.ts`

**Interfaces:**
- Produces (used by Task 2): `deleteVendorContact(id: number): Promise<void>`, `deleteVendorDocument(id: number): Promise<void>` in `lib/vendor/api.ts`.
- Produces (used by Task 4): `VendorDocument.id: number` in `lib/vendor/types.ts`.

- [ ] **Step 1: Add `id` to `VendorDocument`**

In `lib/vendor/types.ts`, the current interface (lines 33-41) is:

```ts
export interface VendorDocument {
  documentType: string;
  fileName: string;
  filePath: string;
  status: string;
  verifiedBy: User;
  verifiedAt: string;
  remark: string;
}
```

Replace it with:

```ts
export interface VendorDocument {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  status: string;
  verifiedBy: User;
  verifiedAt: string;
  remark: string;
}
```

- [ ] **Step 2: Fix `deleteVendorContact` and add `deleteVendorDocument`**

In `lib/vendor/api.ts`, the current `deleteVendorContact` (lines 36-38) is:

```ts
export async function deleteVendorContact(): Promise<void> {
  await api.delete("/api/v1/vendor/contact");
}
```

Replace it, and add `deleteVendorDocument` immediately after `saveVendorDocument` (end of file):

```ts
export async function deleteVendorContact(id: number): Promise<void> {
  await api.delete(`/api/v1/vendor/contact/${id}`);
}
```

```ts
export async function deleteVendorDocument(id: number): Promise<void> {
  await api.delete(`/api/v1/vendor/document/${id}`);
}
```

The full file after this step:

```ts
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import type {
  SaveVendorContactPayload,
  UpdateVendorDocumentPayload,
  UpdateVendorInfoPayload,
  VendorProfile,
} from "@/lib/vendor/types";

export async function fetchVendorProfile(): Promise<VendorProfile | null> {
  try {
    const { data } = await api.get<{ data: VendorProfile }>(
      "/api/v1/vendor/profile",
    );
    return data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function updateVendorInfo(
  payload: UpdateVendorInfoPayload,
): Promise<void> {
  await api.post("/api/v1/vendor/info", payload);
}

export async function saveVendorContact(
  payload: SaveVendorContactPayload,
): Promise<void> {
  await api.post("/api/v1/vendor/contact", payload);
}

export async function deleteVendorContact(id: number): Promise<void> {
  await api.delete(`/api/v1/vendor/contact/${id}`);
}

export async function saveVendorDocument(
  payload: UpdateVendorDocumentPayload,
): Promise<void> {
  const formData = new FormData();
  formData.append("documentType", payload.documentType);
  formData.append("file", payload.file);
  await api.post("/api/v1/vendor/document", formData);
}

export async function deleteVendorDocument(id: number): Promise<void> {
  await api.delete(`/api/v1/vendor/document/${id}`);
}
```

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing errors as baseline (`app/(auth)/reset-password/...`, `lib/auth/permissions.ts`), nothing new from `lib/vendor/`.

- [ ] **Step 4: Commit**

```bash
git add lib/vendor/types.ts lib/vendor/api.ts
git commit -m "fix(vendor): add document id to delete contact and document by id"
```

---

### Task 2: Add `useDeleteVendorContact` and `useDeleteVendorDocument` mutations

**Files:**
- Modify: `lib/vendor/mutations.ts`

**Interfaces:**
- Consumes: `deleteVendorContact(id: number): Promise<void>`, `deleteVendorDocument(id: number): Promise<void>` from Task 1.
- Produces (used by Task 3 and Task 4): `useDeleteVendorContact()` and `useDeleteVendorDocument()` — both return a TanStack `UseMutationResult` whose `mutateAsync` takes a `number` id.

- [ ] **Step 1: Add the two mutations**

In `lib/vendor/mutations.ts`, change the import block (currently lines 6-10):

```ts
import {
  saveVendorContact,
  saveVendorDocument,
  updateVendorInfo,
} from "@/lib/vendor/api";
```

to:

```ts
import {
  deleteVendorContact,
  deleteVendorDocument,
  saveVendorContact,
  saveVendorDocument,
  updateVendorInfo,
} from "@/lib/vendor/api";
```

Then append these two functions at the end of the file (after `useSaveVendorDocument`):

```ts
export function useDeleteVendorContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteVendorContact(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: VENDOR_PROFILE_QUERY_KEY }),
  });
}

export function useDeleteVendorDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteVendorDocument(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: VENDOR_PROFILE_QUERY_KEY }),
  });
}
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing errors as baseline, nothing new from `lib/vendor/`.

- [ ] **Step 3: Commit**

```bash
git add lib/vendor/mutations.ts
git commit -m "feat(vendor): add delete contact and delete document mutations"
```

---

### Task 3: Wire `DeleteContactDialog` to the real mutation

**Files:**
- Modify: `app/(public)/profiles/contract/_components/delete-contact-dialog.tsx`

**Interfaces:**
- Consumes: `useDeleteVendorContact()` from Task 2.

- [ ] **Step 1: Replace the file contents**

Current `app/(public)/profiles/contract/_components/delete-contact-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { VendorContact } from "@/lib/vendor/types";
import { Trash2 } from "lucide-react";

export default function DeleteContactDialog({
  contact,
  disabled,
}: {
  contact: VendorContact;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="ลบผู้ติดต่อ"
            disabled={disabled}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed"
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบผู้ติดต่อ</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบผู้ติดต่อ &quot;{contact.contactName}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={() => {
              console.log({ action: "delete", contact });
              setOpen(false);
            }}
          >
            ลบผู้ติดต่อ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Replace the full file with:

```tsx
"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { VendorContact } from "@/lib/vendor/types";
import { useDeleteVendorContact } from "@/lib/vendor/mutations";
import { Trash2 } from "lucide-react";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบข้อมูลผู้ติดต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeleteContactDialog({
  contact,
  disabled,
}: {
  contact: VendorContact;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const deleteVendorContactMutation = useDeleteVendorContact();

  const handleDelete = () => {
    toast.promise(deleteVendorContactMutation.mutateAsync(contact.id), {
      loading: "กำลังลบผู้ติดต่อ...",
      success: () => {
        setOpen(false);
        return "ลบข้อมูลผู้ติดต่อสำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="ลบผู้ติดต่อ"
            disabled={disabled}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed"
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบผู้ติดต่อ</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบผู้ติดต่อ &quot;{contact.contactName}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteVendorContactMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบผู้ติดต่อ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing errors as baseline, nothing new.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: no new errors/warnings from this file.

- [ ] **Step 4: Manual verification**

Run (from `frontend/`): `npm run dev`, log in as a vendor with 2+ contacts, go to the "ผู้ติดต่อ" tab (`/profiles/contract`).
- Click the trash icon on a non-last contact → dialog opens with "ต้องการลบผู้ติดต่อ "<name>" ใช่หรือไม่?" → click "ลบผู้ติดต่อ" → toast shows "กำลังลบผู้ติดต่อ..." then "ลบข้อมูลผู้ติดต่อสำเร็จ" → dialog closes → contact row disappears from the list.
- With only 1 contact left, confirm the trash icon is still disabled (pre-existing `disabled` prop from `contract/page.tsx`, unaffected by this change).

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/profiles/contract/_components/delete-contact-dialog.tsx"
git commit -m "feat(vendor): wire the delete-contact dialog to the real API"
```

---

### Task 4: Create `DeleteDocumentDialog`

**Files:**
- Create: `app/(public)/profiles/document/_components/delete-document-dialog.tsx`

**Interfaces:**
- Consumes: `useDeleteVendorDocument()` from Task 2, `VendorDocument` (with `.id`) from Task 1.
- Produces (used by Task 5): `DeleteDocumentDialog({ document: VendorDocument })` — default export.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { VendorDocument } from "@/lib/vendor/types";
import { useDeleteVendorDocument } from "@/lib/vendor/mutations";
import { Trash2 } from "lucide-react";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeleteDocumentDialog({
  document,
}: {
  document: VendorDocument;
}) {
  const [open, setOpen] = useState(false);
  const deleteVendorDocumentMutation = useDeleteVendorDocument();

  const handleDelete = () => {
    toast.promise(deleteVendorDocumentMutation.mutateAsync(document.id), {
      loading: "กำลังลบเอกสาร...",
      success: () => {
        setOpen(false);
        return "ลบเอกสารสำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="ลบไฟล์"
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบเอกสาร</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบเอกสาร &quot;{document.fileName}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteVendorDocumentMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบเอกสาร
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing errors as baseline, nothing new (this file isn't imported anywhere yet, so it must type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add "app/(public)/profiles/document/_components/delete-document-dialog.tsx"
git commit -m "feat(vendor): add the delete-document confirmation dialog"
```

---

### Task 5: Wire `DocumentRow` to `DeleteDocumentDialog`

**Files:**
- Modify: `app/(public)/profiles/document/_components/document-row.tsx`

**Interfaces:**
- Consumes: `DeleteDocumentDialog` from Task 4.

- [ ] **Step 1: Replace the file contents**

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
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { useSaveVendorDocument } from "@/lib/vendor/mutations";

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

  const handleDelete = () => {
    console.log({ action: "delete", documentType, existingDocument });
    setSelectedFile(null);
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

        {fileName && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="ลบไฟล์"
            onClick={handleDelete}
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
          </Button>
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

Note what changed: `Trash2` import dropped (moved into `delete-document-dialog.tsx`), `handleDelete` removed, the trailing conditional block now renders `<DeleteDocumentDialog>` gated on `existingDocument` existing (has an `id` to delete) and no upload currently in flight (a freshly picked file has no `id` yet).

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing errors as baseline, nothing new.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: no new errors/warnings from this file (in particular, no "unused import" warning for the removed `Trash2` import).

- [ ] **Step 4: Manual verification**

With `npm run dev` still running, go to the "เอกสารประกอบการขึ้นทะเบียน" tab (`/profiles/document`):
- On an empty row, click "แนบไฟล์" and pick a file. While "กำลังอัปโหลดเอกสาร..." toast is showing, confirm no trash icon appears next to the row's buttons.
- After the upload succeeds, confirm the trash icon now appears.
- Click it → dialog opens with "ต้องการลบเอกสาร "<filename>" ใช่หรือไม่?" → click "ลบเอกสาร" → toast shows "กำลังลบเอกสาร..." then "ลบเอกสารสำเร็จ" → row reverts to "ยังไม่มีเอกสาร" with no badge and no trash icon.
- Re-attach a file to the same row, then use "เปลี่ยนไฟล์" to replace it — confirm the trash icon disappears during that re-upload and reappears once it completes.
- Check both light and dark mode for the new dialog.

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/profiles/document/_components/document-row.tsx"
git commit -m "feat(vendor): wire the document delete button to the confirmation dialog"
```

---

### Task 6: Full regression pass

**Files:** None (verification only).

- [ ] **Step 1: Full type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: exactly the same 8 pre-existing errors as the Task 1 baseline — confirms no file touched by this plan introduced a new error.

- [ ] **Step 2: Full lint**

Run (from `frontend/`): `npm run lint`
Expected: exactly the same 8 pre-existing errors as the Task 3 baseline (`react/no-unescaped-entities` in `components/legal/privacy-content.tsx` and `components/legal/terms-content.tsx`) — confirms no new errors/warnings introduced by this plan's files.

- [ ] **Step 3: Production build**

Run (from `frontend/`): `npm run build`
Expected: build succeeds (Next.js build performs its own type-check pass across the app; confirms nothing in the changed files breaks the build even though the 8 pre-existing `tsc` errors exist outside this plan's scope — if the build fails specifically because of those 8 pre-existing errors, that's a pre-existing condition to note, not something this plan introduced).

- [ ] **Step 4: End-to-end manual pass**

Run (from `frontend/`): `npm run dev`. Repeat the five checks from the spec's Testing section in one pass:
1. Contract tab: delete a non-last contact → success toast → row disappears. Confirm last-remaining-contact trash icon is still disabled.
2. Force a failed delete (e.g. click delete on a contact, then quickly delete the same contact again in a second tab before the first finishes, or temporarily stop the backend) → error toast with the backend's message, dialog stays open, contact still listed.
3. Document tab: attach → delete → row reverts to "ยังไม่มีเอกสาร".
4. During an active upload, confirm no trash icon shows.
5. Check both light and dark mode for both dialogs (`Ctrl/Cmd`-toggle or OS theme switch, per however this repo's theme toggle works — see `next-themes` usage in `app/layout.tsx` or the profile navbar).
