# Vendor Document Upload Progress Bar + Cancel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show upload progress (a thin bar pinned to the bottom edge of the document card) and let the user cancel an in-flight document upload (a floating X button in the card's top-right corner), for `app/(public)/profiles/document/_components/document-row.tsx`.

**Architecture:** Add a `components/ui/progress.tsx` wrapper around `@base-ui/react/progress`. Extend `UpdateVendorDocumentPayload` (`lib/vendor/types.ts`) with optional `signal`/`onUploadProgress` fields, and thread them through `saveVendorDocument` (`lib/vendor/api.ts`) into the underlying `axios` `api.post` call. `document-row.tsx` creates an `AbortController` per upload, tracks `uploadProgress` locally, replaces its `toast.promise` with manual `try/catch/finally` so a cancelled upload gets a distinct neutral toast instead of the error-styled one, and renders the new `Progress` bar + a cancel `Button` only while the upload is pending.

**Tech Stack:** Next.js 16, React 19, TypeScript 5 (strict), `@base-ui/react` (this codebase's shadcn primitive layer — **not** Radix), axios 1.18 (already supports `onUploadProgress` and `AbortSignal` cancellation), sonner (toast), `@tanstack/react-query`. No test runner configured in this repo — verification is `tsc --noEmit`, `eslint`, `next build`, and manual checks via `npm run dev`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-vendor-document-upload-progress-design.md`.
- Frontend-only — no backend changes. Cancelling is a client-side `AbortController`/axios-`signal` abort of the HTTP request; no server-side cleanup logic is added.
- No numeric percentage is ever rendered as visible text — the bar's fill width is the only visual indicator (the percentage still reaches the DOM via the `Progress` component's own `aria-valuenow`/`aria-valuetext`, which `@base-ui/react/progress` sets automatically from the `value` prop).
- Exact Thai copy (do not deviate): loading toast `"กำลังอัปโหลดเอกสาร..."` (unchanged from current code), success toast `"อัปโหลดเอกสารสำเร็จ"` (unchanged), cancel toast `"ยกเลิกการอัปโหลดแล้ว"` (new — via `toast.message`, not `toast.error`), cancel button `aria-label="ยกเลิกการอัปโหลด"`.
- Use `axios`'s own `isCancel` helper (`import { isCancel } from "axios"`) to detect a cancelled request — do not match on `error.code` strings directly.
- `components/ui/progress.tsx` must wrap `@base-ui/react/progress`, following the existing pattern in `components/ui/tabs.tsx`/`components/ui/button.tsx` (no semicolons in this file, `data-slot` attributes, `cn` from `@/lib/utils` for class merging). Do not add a Radix dependency — this project has none (`components.json`'s `"style": "base-nova"`).
- File paths below are relative to `frontend/` (repo root `D:\E-Procurement-System`, `frontend/`/`backend/` are siblings).
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Current baseline (confirmed 2026-07-25): 8 pre-existing, unrelated errors — 2x `app/(auth)/reset-password/_components/reset-password-view.tsx` (`TS2339`, missing route keys), 6x `lib/auth/permissions.ts` (`TS2345`, `CurrentUser`/`User` mismatch). Confirm no *new* errors after each task.
- Verify lint with `npm run lint` from `frontend/`. Current baseline (confirmed 2026-07-25): 8 pre-existing, unrelated `react/no-unescaped-entities` errors in `components/legal/privacy-content.tsx` (2) and `components/legal/terms-content.tsx` (6). Confirm no new errors after each task.

---

### Task 1: Add the `Progress` UI primitive

**Files:**
- Create: `components/ui/progress.tsx`

**Interfaces:**
- Produces (used by Task 3): `export function Progress({ className, value, ...props }: ProgressPrimitive.Root.Props)` — a React component rendering a Base UI progress bar. `value` is `number | null` (0-100, or `null` for indeterminate); the filled portion's width is computed internally by `@base-ui/react/progress`'s `ProgressIndicator`, no manual percent math needed by callers.

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="block h-full w-full"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="block h-full bg-primary transition-[width] duration-200 ease-linear"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors listed in Global Constraints, nothing new. `Progress` isn't imported anywhere yet, which is not a type error (unused exports aren't flagged — no `noUnusedLocals` in `tsconfig.json`).

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new from `components/ui/progress.tsx`.

- [ ] **Step 4: Commit**

```bash
git add "components/ui/progress.tsx"
git commit -m "feat(ui): add Progress component wrapping @base-ui/react/progress"
```

---

### Task 2: Thread `signal`/`onUploadProgress` through the vendor document upload API

**Files:**
- Modify: `lib/vendor/types.ts`
- Modify: `lib/vendor/api.ts`

**Interfaces:**
- Produces (used by Task 3): `UpdateVendorDocumentPayload` gains two optional fields: `signal?: AbortSignal` and `onUploadProgress?: (percent: number) => void`. `saveVendorDocument(payload: UpdateVendorDocumentPayload): Promise<void>` (signature unchanged) now forwards `signal` to axios and, if `onUploadProgress` is provided, calls it with a `0-100` integer computed from axios's upload progress events.

- [ ] **Step 1: Extend `UpdateVendorDocumentPayload`**

In `lib/vendor/types.ts`, current:

```ts
export interface UpdateVendorDocumentPayload {
  documentType: string;
  file: File;
}
```

Replace with:

```ts
export interface UpdateVendorDocumentPayload {
  documentType: string;
  file: File;
  signal?: AbortSignal;
  onUploadProgress?: (percent: number) => void;
}
```

Nothing else in this file changes.

- [ ] **Step 2: Thread the new fields into `saveVendorDocument`**

In `lib/vendor/api.ts`, current:

```ts
export async function saveVendorDocument(
  payload: UpdateVendorDocumentPayload,
): Promise<void> {
  const formData = new FormData();
  formData.append("documentType", payload.documentType);
  formData.append("file", payload.file);
  await api.post("/api/v1/vendor/document", formData);
}
```

Replace with:

```ts
export async function saveVendorDocument(
  payload: UpdateVendorDocumentPayload,
): Promise<void> {
  const formData = new FormData();
  formData.append("documentType", payload.documentType);
  formData.append("file", payload.file);
  await api.post("/api/v1/vendor/document", formData, {
    signal: payload.signal,
    onUploadProgress: payload.onUploadProgress
      ? (event) => {
          const total = event.total ?? payload.file.size;
          payload.onUploadProgress!(Math.round((event.loaded / total) * 100));
        }
      : undefined,
  });
}
```

Nothing else in this file changes. `lib/vendor/mutations.ts`'s `useSaveVendorDocument` needs no edit — its `mutationFn: (payload: UpdateVendorDocumentPayload) => saveVendorDocument(payload)` already forwards the whole object, so the new optional fields pass through automatically.

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new. This is the point where a typo in the `AxiosProgressEvent` field names (`loaded`/`total`) would surface as a new error — confirm it doesn't.

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 5: Commit**

```bash
git add "lib/vendor/types.ts" "lib/vendor/api.ts"
git commit -m "feat(vendor): support upload progress and cancellation in saveVendorDocument"
```

---

### Task 3: Wire progress bar + cancel button into `DocumentRow`

**Files:**
- Modify: `app/(public)/profiles/document/_components/document-row.tsx`

**Interfaces:**
- Consumes: `Progress` from Task 1 (`@/components/ui/progress`); `UpdateVendorDocumentPayload`'s `signal`/`onUploadProgress` fields from Task 2 (already accepted transparently by `useSaveVendorDocument().mutateAsync`).

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
import { FileText, Paperclip } from "lucide-react";
import { useSaveVendorDocument } from "@/lib/vendor/mutations";
import { getVendorDocumentViewUrl } from "@/lib/vendor/api";
import DeleteDocumentDialog from "./delete-document-dialog";
import { FILE_KIND_CONFIG, type FileKind } from "../../data/document-types";
import Link from "next/link";

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
  const fileExtension = fileName?.split(".").pop()?.toUpperCase();
  const status = selectedFile ? STATUS_STYLE.pending : (existingDocument && STATUS_STYLE[existingDocument.status]);
  const viewUrl =
    existingDocument && !updateVendorDocumentMutation.isPending
      ? getVendorDocumentViewUrl(existingDocument.id)
      : undefined;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-md">
      <div className="flex items-center gap-2 md:gap-3.5 min-w-0 flex-1">
        {viewUrl ? (
          <Link
            href={viewUrl}
            target="_blank"
            rel="noopener"
            aria-label={`ดูไฟล์ ${fileName}`}
            className="flex items-center justify-center shrink-0 w-11 h-11 rounded-md bg-red-700 text-white text-xs font-bold hover:bg-red-800 transition-colors"
          >
            {fileExtension}
          </Link>
        ) : fileName ? (
          <div className="flex items-center justify-center shrink-0 w-11 h-11 rounded-md bg-red-700 text-white text-xs font-bold">
            {fileExtension}
          </div>
        ) : (
          <div className="flex items-center justify-center shrink-0 w-11 h-11 rounded-md bg-gray-200 text-gray-600">
            <FileText size={20} />
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-col-reverse md:flex-row md:items-center gap-1 md:gap-2.5">
            <div className="flex items-center gap-1.5">
              {viewUrl ? (
                <Link
                  href={viewUrl}
                  target="_blank"
                  rel="noopener"
                  className="font-bold tracking-wide hover:underline"
                >
                  {label}
                </Link>
              ) : (
                <p className="font-bold tracking-wide">{label}</p>
              )}
              {required && !fileName && (
                <span
                  className="w-1.75 h-1.75 shrink-0 rounded-full bg-red-600"
                  role="img"
                  aria-label="เอกสารบังคับ"
                  title="เอกสารบังคับ"
                />
              )}
            </div>

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
          {viewUrl ? (
            <Link
              href={viewUrl}
              target="_blank"
              rel="noopener"
              className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal hover:underline"
            >
              {fileName}
              {fileSize && ` · ${fileSize}`}
            </Link>
          ) : (
            <p className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal">
              {fileName ?? "ยังไม่มีเอกสาร"}
            </p>
          )}
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

Replace the full file with:

```tsx
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { isAxiosError, isCancel } from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { VendorDocument } from "@/lib/vendor/types";
import { FileText, Paperclip, X } from "lucide-react";
import { useSaveVendorDocument } from "@/lib/vendor/mutations";
import { getVendorDocumentViewUrl } from "@/lib/vendor/api";
import DeleteDocumentDialog from "./delete-document-dialog";
import { FILE_KIND_CONFIG, type FileKind } from "../../data/document-types";
import Link from "next/link";

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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const updateVendorDocumentMutation = useSaveVendorDocument();

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
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
    setUploadProgress(0);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const toastId = toast.loading("กำลังอัปโหลดเอกสาร...");

    try {
      await updateVendorDocumentMutation.mutateAsync({
        documentType,
        file,
        signal: controller.signal,
        onUploadProgress: setUploadProgress,
      });
      toast.success("อัปโหลดเอกสารสำเร็จ", { id: toastId });
    } catch (error) {
      if (isCancel(error)) {
        toast.message("ยกเลิกการอัปโหลดแล้ว", { id: toastId });
      } else {
        toast.error(getErrorMessage(error), { id: toastId });
      }
    } finally {
      setSelectedFile(null);
      setUploadProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    abortControllerRef.current?.abort();
  };

  const fileName = selectedFile?.name ?? existingDocument?.fileName;
  const fileSize = selectedFile ? formatFileSize(selectedFile.size) : undefined;
  const fileExtension = fileName?.split(".").pop()?.toUpperCase();
  const status = selectedFile ? STATUS_STYLE.pending : (existingDocument && STATUS_STYLE[existingDocument.status]);
  const viewUrl =
    existingDocument && !updateVendorDocumentMutation.isPending
      ? getVendorDocumentViewUrl(existingDocument.id)
      : undefined;

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-md overflow-hidden">
      <div className="flex items-center gap-2 md:gap-3.5 min-w-0 flex-1">
        {viewUrl ? (
          <Link
            href={viewUrl}
            target="_blank"
            rel="noopener"
            aria-label={`ดูไฟล์ ${fileName}`}
            className="flex items-center justify-center shrink-0 w-11 h-11 rounded-md bg-red-700 text-white text-xs font-bold hover:bg-red-800 transition-colors"
          >
            {fileExtension}
          </Link>
        ) : fileName ? (
          <div className="flex items-center justify-center shrink-0 w-11 h-11 rounded-md bg-red-700 text-white text-xs font-bold">
            {fileExtension}
          </div>
        ) : (
          <div className="flex items-center justify-center shrink-0 w-11 h-11 rounded-md bg-gray-200 text-gray-600">
            <FileText size={20} />
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-col-reverse md:flex-row md:items-center gap-1 md:gap-2.5">
            <div className="flex items-center gap-1.5">
              {viewUrl ? (
                <Link
                  href={viewUrl}
                  target="_blank"
                  rel="noopener"
                  className="font-bold tracking-wide hover:underline"
                >
                  {label}
                </Link>
              ) : (
                <p className="font-bold tracking-wide">{label}</p>
              )}
              {required && !fileName && (
                <span
                  className="w-1.75 h-1.75 shrink-0 rounded-full bg-red-600"
                  role="img"
                  aria-label="เอกสารบังคับ"
                  title="เอกสารบังคับ"
                />
              )}
            </div>

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
          {viewUrl ? (
            <Link
              href={viewUrl}
              target="_blank"
              rel="noopener"
              className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal hover:underline"
            >
              {fileName}
              {fileSize && ` · ${fileSize}`}
            </Link>
          ) : (
            <p className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal">
              {fileName ?? "ยังไม่มีเอกสาร"}
            </p>
          )}
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

      {updateVendorDocumentMutation.isPending && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleCancelUpload}
            aria-label="ยกเลิกการอัปโหลด"
            className="absolute top-2 right-2 bg-background/80"
          >
            <X />
          </Button>
          <Progress
            value={uploadProgress}
            className="absolute inset-x-0 bottom-0 h-1 w-full rounded-none bg-transparent"
          />
        </>
      )}
    </div>
  );
}
```

Note what changed from before: new imports (`isCancel` from `axios`, `Progress` from `@/components/ui/progress`, `X` from `lucide-react`); new `uploadProgress` state and `abortControllerRef` ref; `handleChange` is now `async` and uses `try/catch/finally` instead of `toast.promise` (adding the `AbortController` creation, the `signal`/`onUploadProgress` fields on the `mutateAsync` call, and the `isCancel(error)` branch); new `handleCancelUpload` function; the root `<div>` gains `relative`/`overflow-hidden`; and a new conditional block renders the cancel button + progress bar while `updateVendorDocumentMutation.isPending`. The extension-check block, delete-dialog gating, badges, file-size formatting, and the rest of the JSX are byte-for-byte unchanged.

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new. This is the point where a signature mismatch between `onUploadProgress: setUploadProgress` and `UpdateVendorDocumentPayload`'s `onUploadProgress?: (percent: number) => void` would surface — confirm it doesn't (a `Dispatch<SetStateAction<number | null>>` setter is assignable here because its parameter type is broader than `number` alone).

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Build**

Run (from `frontend/`): `npm run build`
Expected: Turbopack's compile phase succeeds (real evidence the change bundles correctly); the overall command still exits non-zero solely because of the pre-existing, unrelated `reset-password-view.tsx` TypeScript error during the build's type-check phase — a pre-existing condition, not a regression from this task. Report the compile-phase result explicitly.

- [ ] **Step 5: Manual verification**

If you have `npm run dev` running and browser access: pick a document row, select a reasonably large file (or throttle the network in devtools) and confirm (a) the thin bottom-edge bar fills left-to-right as the upload proceeds, (b) the X button appears top-right during the upload and clicking it aborts the request (visible in devtools Network tab as cancelled), shows the neutral "ยกเลิกการอัปโหลดแล้ว" toast (not styled as an error), and the row reverts to its pre-upload state, (c) letting an upload finish normally still shows the "อัปโหลดเอกสารสำเร็จ" toast and the row displays the uploaded file, (d) forcing a real failure (e.g. stop the backend mid-upload) still shows the existing red error toast, distinct from the cancel toast, and (e) the "แนบไฟล์"/"เปลี่ยนไฟล์" button stays disabled and the delete button stays hidden for the whole duration of an upload, same as before this change. If you do not have browser access in your environment, skip this step and say so explicitly in your report — do not fabricate a result.

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/profiles/document/_components/document-row.tsx"
git commit -m "feat(vendor): add upload progress bar and cancel button to document row"
```
