# Wire up vendor contact delete and vendor document delete

## Context

Both backend endpoints already exist and are tested (backend, not this repo):
- `DELETE /api/v1/vendor/contact/{id}` — `VendorController::deleteVendorContact()`, returns `{ message: 'ลบข้อมูลผู้ติดต่อสำเร็จ', data: VendorProfileResource }` on success, `{ message: 'ลบข้อมูลผู้ติดต่อไม่สำเร็จ' }` (500) on failure.
- `DELETE /api/v1/vendor/document/{id}` — `VendorController::deleteVendorDocument()`, returns `{ message: 'ลบเอกสารสำเร็จ', data: VendorProfileResource }` on success, `{ message: 'ลบเอกสารไม่สำเร็จ' }` (500) on failure. `VendorDocumentResource` now includes `id` as the first key (see `backend/docs/superpowers/specs/2026-07-23-vendor-document-delete-design.md`, which explicitly deferred all frontend work to a separate task — this spec is that task).

The frontend has two half-wired stubs left over from that deferred work:
- `lib/vendor/api.ts:36-38` — `deleteVendorContact` has a syntax error (`asynac`) and takes no id, so it doesn't compile and couldn't call the real endpoint even fixed as-is.
- `app/(public)/profiles/contract/_components/delete-contact-dialog.tsx` — `AlertDialogAction`'s `onClick` is `console.log({ action: "delete", contact })`.
- `app/(public)/profiles/document/_components/document-row.tsx`'s `handleDelete` is `console.log({ action: "delete", documentType, existingDocument })` with no confirmation step at all.

`lib/vendor/types.ts`'s `VendorDocument` interface predates the backend change and has no `id` field, so nothing in the frontend can currently address a specific document to delete.

This task wires all three stubs to the real endpoints. No backend changes.

## Part 1: `lib/vendor/types.ts`

Add `id` to `VendorDocument`, mirroring `VendorContact.id`:

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

## Part 2: `lib/vendor/api.ts`

Fix the broken `deleteVendorContact` and add `deleteVendorDocument`, following the existing functions' style (thin `api.delete` wrappers, no try/catch — errors propagate to the caller same as every other function in this file):

```ts
export async function deleteVendorContact(id: number): Promise<void> {
  await api.delete(`/api/v1/vendor/contact/${id}`);
}

export async function deleteVendorDocument(id: number): Promise<void> {
  await api.delete(`/api/v1/vendor/document/${id}`);
}
```

## Part 3: `lib/vendor/mutations.ts`

Add two mutations following the exact shape of `useSaveVendorContact`/`useSaveVendorDocument` already in this file (invalidate `VENDOR_PROFILE_QUERY_KEY` on success, no custom error handling — the caller's `toast.promise` handles that):

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

## Part 4: `delete-contact-dialog.tsx` — wire the existing dialog

Replace the `console.log` action with a real mutation, following the `toast.promise` + local `getErrorMessage` pattern already used in `use-add-contact-form.ts` and `document-row.tsx` (extract the 422/500 message from the axios error, fall back to the backend's own success/failure copy). Close the dialog only on success; keep it open and let the user retry on failure. Disable the confirm button while the mutation is in flight so a double-click can't fire two deletes.

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

The existing `disabled` prop (passed from `contract/page.tsx` as `(vendor?.contact?.length ?? 0) <= 1`, blocking deletion of the last remaining contact) is untouched.

## Part 5: `delete-document-dialog.tsx` (new)

Same `AlertDialog` shape as Part 4, adapted for a document. Takes the full `VendorDocument` (needs `.id` for the mutation and `.fileName` for the confirmation copy):

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

## Part 6: `document-row.tsx` change

Remove the inline delete `Button` + `handleDelete` (and the now-unused `Trash2` import), replace with `DeleteDocumentDialog`. Only render it when there's a persisted document to target — i.e. `existingDocument` exists and isn't mid-replacement. A freshly picked `selectedFile` that hasn't finished uploading yet has no `id`, so there's nothing to send to `DELETE /api/v1/vendor/document/{id}`; the trash icon simply doesn't render during that window (it already had no real effect there before this change, since the old handler only did `console.log` + clear local state — this closes that dead corner instead of wiring it to a call that would 404).

```tsx
// imports: drop `Trash2`, add:
import DeleteDocumentDialog from "./delete-document-dialog";

// drop the handleDelete function entirely

// replace the trailing conditional block:
{existingDocument && !updateVendorDocumentMutation.isPending && (
  <DeleteDocumentDialog document={existingDocument} />
)}
```

(`fileName`/`fileSize`/`status` derivation above it is unchanged.)

## Error Handling

Both dialogs use `toast.promise`, matching every other vendor mutation call site in this codebase (`use-add-contact-form.ts`, `document-row.tsx`'s upload handler). Axios error responses' `message` field (set by the backend's Thai copy) is preferred; a hardcoded Thai fallback covers network failures where no response body exists. On failure the dialog stays open so the user can retry without re-triggering the confirmation step.

## Out of scope

- Any backend change — both endpoints are already implemented, tested, and merged.
- Preventing deletion of a "required" document type — the backend doesn't restrict this either; a deleted required document just reverts its row to "ยังไม่มีเอกสาร" like it never had a file, same as before any document existed.
- A minimum-document-count guard analogous to `disabled={... <= 1}` on contacts — there's no such rule for documents (each row is one fixed document-type slot, not an open list).
- Extracting the duplicated `getErrorMessage` helper into a shared util — it's already duplicated twice in this codebase (`use-add-contact-form.ts`, `document-row.tsx`) without being shared; this task follows that existing convention rather than introducing a new one.

## Testing

No test runner is configured in this repo (consistent with prior frontend specs). Verification is manual:
1. Contract tab: delete a non-last contact → confirm dialog → "กำลังลบผู้ติดต่อ..." toast → row disappears, success toast. Try deleting with only one contact left → trash icon still disabled as before (unrelated to this change).
2. Simulate a failed delete (e.g. stop the backend or delete an already-deleted id twice quickly) → error toast with the backend's message, dialog stays open.
3. Document tab: attach a file to an empty row → once upload completes, trash icon appears → delete it → confirm dialog → row reverts to "ยังไม่มีเอกสาร".
4. While a document is actively uploading (brief window), confirm no trash icon is shown for that row.
5. Check both light and dark mode for both dialogs.
