# Upload progress bar + cancel for vendor document upload

## Context

`app/(public)/profiles/document/_components/document-row.tsx` uploads a document via `useSaveVendorDocument().mutateAsync({ documentType, file })` (`lib/vendor/mutations.ts` → `lib/vendor/api.ts`'s `saveVendorDocument`, which posts a `FormData` through the shared `api` axios instance in `lib/api.ts`). The only upload feedback today is a `toast.promise` with static "กำลังอัปโหลดเอกสาร..." loading text — no progress percentage, and no way to cancel an in-flight upload.

The user wants: a progress indicator while the file is uploading, and a way to cancel mid-upload.

This is frontend-only. Cancelling is a client-side abort of the HTTP request (`AbortController` → axios `signal`); no backend endpoint or cleanup logic changes, consistent with how backend/frontend work is split into separate plans elsewhere in this codebase (e.g. `2026-07-24-vendor-document-file-type-restrictions-design.md`).

The project uses `@base-ui/react` (shadcn style `"base-nova"`, see `components.json`), **not** Radix — every existing `components/ui/*.tsx` wraps a `@base-ui/react/*` primitive (see `tabs.tsx`, `dialog.tsx`, `button.tsx`). There is no Progress component yet; one needs to be added the same way.

`axios` (`^1.18.1`, already a dependency) natively supports `onUploadProgress` and request cancellation via the standard `AbortController`/`signal`, and using it keeps the existing `api` instance's interceptors (CSRF-cookie retry on 419, 401 handling — see `lib/api.ts`) in effect. This is simpler and more consistent than hand-rolling `XMLHttpRequest` just for this one call, so it's the approach used below.

## UI design

Per user's choice, during upload the document card (`DocumentRow`'s root `<div>`) gets:
- A thin (2px) progress bar pinned to the **bottom edge of the card**, full width, filling left-to-right as the upload progresses.
- A small floating **cancel (X) button** in the card's **top-right corner**.

No numeric percentage is displayed as text — the bar itself is the only visual indicator (the percentage is still exposed via the progress element's `aria-valuenow`/`aria-valuetext` for accessibility). Both elements only render while the upload for that row is in flight, and disappear immediately after (success, error, or cancel all clear them the same way).

The existing disabled/hidden states during upload are unchanged: the "แนบไฟล์/เปลี่ยนไฟล์" button stays `disabled` while pending, and the delete button stays hidden while pending (both already gated on `updateVendorDocumentMutation.isPending`).

## Part 1: `components/ui/progress.tsx` (new)

A thin wrapper around `@base-ui/react/progress`, following this codebase's existing pattern (compare `components/ui/tabs.tsx`): no semicolons, `data-slot` attributes, `cn` for class merging.

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

Base UI's `ProgressIndicator` sets its own `width: {percent}%` inline style computed from `Root`'s `value`/`min`/`max` (default `min=0, max=100`), so passing `value={uploadProgress}` (a `0-100` number, or `null` while indeterminate) on `Root` is all that's needed — no manual percent-to-width math in this file.

Default styling (`h-2 rounded-full bg-primary/20` track, `bg-primary` indicator) matches this codebase's other `ui/` defaults; the bottom-edge-of-card usage overrides `h-2`/`rounded-full` at the call site (see Part 4).

## Part 2: `lib/vendor/types.ts`

Extend `UpdateVendorDocumentPayload` with two optional fields so callers can opt into progress reporting and cancellation without affecting other callers of `saveVendorDocument`:

```ts
export interface UpdateVendorDocumentPayload {
  documentType: string;
  file: File;
  signal?: AbortSignal;
  onUploadProgress?: (percent: number) => void;
}
```

## Part 3: `lib/vendor/api.ts`

Thread `signal` and `onUploadProgress` into the axios call. Percent is computed from `event.loaded` / `event.total` (falling back to `payload.file.size` if `event.total` is momentarily unavailable, since the file's size is already known client-side):

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

`lib/vendor/mutations.ts`'s `useSaveVendorDocument` needs **no change** — its `mutationFn` already forwards the whole payload object to `saveVendorDocument(payload)` as-is.

## Part 4: `document-row.tsx`

**New local state** (alongside the existing `selectedFile`/`inputRef`):

```tsx
const [uploadProgress, setUploadProgress] = useState<number | null>(null);
const abortControllerRef = useRef<AbortController | null>(null);
```

**`handleChange`**: replace the `toast.promise(...)` block with manual `try/catch/finally` so the cancel path can show a distinct, non-error toast. Create an `AbortController` per upload, pass its `signal` and an `onUploadProgress` callback into `mutateAsync`:

```tsx
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
```

`isCancel` is imported from `axios` (`import { isAxiosError, isCancel } from "axios";`) — it's the canonical way to detect an aborted axios request, more robust than string/code-matching.

**Cancel handler:**

```tsx
const handleCancelUpload = () => {
  abortControllerRef.current?.abort();
};
```

**JSX**: mark the root `<div>` `relative` + `overflow-hidden`, and render the cancel button + progress bar only while `updateVendorDocumentMutation.isPending`:

```tsx
<div className="relative flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-md overflow-hidden">
  {/* ...existing content, unchanged... */}

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
```

New imports: `X` from `lucide-react` (alongside the existing `FileText`, `Paperclip`), `Progress` from `@/components/ui/progress`.

## Error handling

- **Real upload errors** (network failure, validation error from the backend, etc.) keep today's behavior exactly: `toast.error(getErrorMessage(error))`, same `getErrorMessage` helper.
- **Cancellation** is detected via `axios.isCancel(error)` and shown as `toast.message(...)` (sonner's neutral/default toast variant — no error styling), matching the user's explicit request for a plain "ยกเลิกการอัปโหลดแล้ว" notice rather than an error-red toast.
- In both the error and cancel cases, and on success, `selectedFile`/`uploadProgress`/`abortControllerRef` are reset the same way (`finally` block), so the row always falls back to showing `existingDocument` (if any) or the empty state — identical to today's reset-on-settle behavior, just now covering three outcomes instead of two.
- Aborting only cancels the in-flight HTTP request from the browser's side; whatever partial state this leaves server-side (e.g. Laravel receiving a broken connection mid-upload) is not addressed here — out of scope per the "frontend-only" framing above.

## Out of scope

- Any backend change (no endpoint to accept a "cancel" signal, no server-side cleanup of partially-received uploads).
- A visible numeric percentage label — the thin bar alone is the indicator, per user's approved design.
- Retrying a cancelled/failed upload automatically — the user re-triggers via the existing "แนบไฟล์"/"เปลี่ยนไฟล์" button, unchanged from today.
- Progress/cancel for any other mutation in this codebase (vendor info, vendor contact) — scoped to document upload only.

## Testing

No test runner is configured in this repo. Verification is manual:
1. Upload a reasonably large file (e.g. a multi-MB PDF/image, or use browser devtools network throttling) and confirm the thin bottom-edge progress bar animates from empty to full, and the cancel (X) button appears top-right during the upload.
2. Click the cancel button mid-upload: confirm the request stops (check devtools Network tab shows it cancelled/aborted), a neutral "ยกเลิกการอัปโหลดแล้ว" toast appears (not styled as an error), the progress bar and cancel button disappear, and the row falls back to its pre-upload state (existing document, or empty).
3. Let an upload finish normally: confirm success toast, progress bar/cancel button disappear, row shows the newly uploaded file — unchanged from current behavior.
4. Force a real error (e.g. stop the backend, or trigger a validation failure) and confirm the existing red error toast with `getErrorMessage(error)` content still appears, distinct from the cancel toast.
5. Confirm the "แนบไฟล์/เปลี่ยนไฟล์" button stays disabled and the delete button stays hidden for the duration of the upload, same as before this change.
