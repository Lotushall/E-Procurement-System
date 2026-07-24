# Per-document-type file restrictions (frontend only)

## Context

`app/(public)/profiles/document/_components/document-row.tsx`'s file `<input>` currently hardcodes `accept=".pdf,.jpg,.jpeg,.png"` — every document row in the checklist accepts the same four extensions, regardless of what kind of document it actually is. The backend mirrors this: `SaveVendorDocumentRequest::rules()` validates `'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240']` for every `documentType` uniformly, with no per-type distinction.

The user wants real per-category restrictions: most document types should be PDF-only, but the ones that are photographed ID-style documents should be image-only. Backend enforcement (making `SaveVendorDocumentRequest` validate `mimes` per `documentType`) is explicitly **out of scope for this task** — it will be handled separately, matching this codebase's established pattern of splitting backend and frontend work into separate plans (e.g. `2026-07-23-vendor-document-delete-design.md` did backend-only, frontend followed in a later plan). This task is frontend-only: restrict the file picker's `accept` attribute per row, and reject a mismatched file client-side before it's ever sent to the (still backend-permissive) upload endpoint.

The confirmed per-category mapping, from `app/(public)/profiles/data/document-types.ts`'s existing `REQUIRED_DOCUMENTS`:

| `key` | label | file kind |
|---|---|---|
| `company_certificate` | หนังสือรับรองบริษัท | PDF |
| `authorized_person_id` | สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ | image |
| `vat_registration` (company) | ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20) | PDF |
| `shareholder_list` | บัญชีรายชื่อผู้ถือหุ้น (บอจ.5) | PDF |
| `financial_statement` | งบการเงิน / หนังสือรับรองฐานะการเงิน | PDF |
| `citizen_id` | สำเนาบัตรประชาชน | image |
| `house_registration` | สำเนาทะเบียนบ้าน | image |
| `commercial_registration` | ทะเบียนพาณิชย์ (ถ้ามี) | PDF |
| `vat_registration` (individual) | ใบทะเบียนภาษีมูลค่าเพิ่ม (ถ้ามี) | PDF |

Only two of nine entries are image-only; everything else stays PDF-only (a stricter default than today's PDF+image-for-everything).

## Part 1: `app/(public)/profiles/data/document-types.ts`

Add a `FileKind` type, a `FILE_KIND_CONFIG` lookup (accept string, allowed extensions, and a ready-to-show Thai error message per kind), and a `fileKind` field on every `RequiredDocument` entry:

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

## Part 2: `app/(public)/profiles/document/page.tsx`

Thread `fileKind` from the data entry down to `DocumentRow`:

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

## Part 3: `document-row.tsx`

Accept the new `fileKind: FileKind` prop, use `FILE_KIND_CONFIG[fileKind].accept` for the `<input>`'s `accept` attribute (replacing the hardcoded `.pdf,.jpg,.jpeg,.png`), and validate the picked file's extension in `handleChange` before doing anything else — a mismatch shows a `toast.error` with the kind's `errorMessage` and stops there, without touching `selectedFile` state or calling the upload mutation:

```tsx
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

  // ...unchanged below (fileName/fileSize/status derivation and JSX)
```

Import `FileKind` and `FILE_KIND_CONFIG` with a relative import, `../../data/document-types` — `document-row.tsx` lives at `app/(public)/profiles/document/_components/`, two levels below `app/(public)/profiles/data/`, matching the relative-import convention `document/page.tsx` already uses for the same module (`../data/document-types`, one level up from `document/page.tsx` itself). Only the `<input>`'s `accept` attribute changes in the JSX (`accept={FILE_KIND_CONFIG[fileKind].accept}` instead of the hardcoded string) — everything else in the file (delete-dialog gating, badges, file size formatting) is untouched.

## Error Handling

The extension check runs synchronously before any state change or network call — an invalid file never enters `selectedFile`, never shows a "รอตรวจสอบ" pending badge, and never reaches `updateVendorDocumentMutation`. `toast.error` (not `toast.promise`) is used here since there's no async operation to track, matching `sonner`'s API for a plain one-shot message. The `accept` attribute change also narrows what most OS file pickers show by default, so this case should be rare in practice — the JS check exists for browsers/flows that don't honor `accept` strictly (e.g. some mobile pickers, or a user removing the filter).

## Out of scope

- Backend `mimes` validation per `documentType` — `SaveVendorDocumentRequest` keeps accepting `pdf,jpg,jpeg,png` for every type; a mismatched-but-technically-still-allowed file (e.g. uploading a PNG to a PDF-only slot via some path that bypasses this frontend check entirely, like a direct API call) is still accepted server-side. Deferred to a separate backend-focused plan, per user's explicit choice.
- Any change to the 10MB (`max:10240`) size limit or to any other validation rule in `SaveVendorDocumentRequest`.
- MIME-type sniffing (`file.type`) or file-content inspection — the check is filename-extension-based only, consistent with how the `accept` attribute itself already communicates the restriction and with the backend's own `mimes` rule (which is extension-driven from the client's perspective).
- Any visual hint/label on the row indicating which file kind is expected (e.g. "(PDF)" next to the label) — not requested; the `accept` attribute and the error message are the only signals for now.

## Testing

No test runner is configured in this repo. Verification is manual:
1. Company vendor: confirm the file picker for "หนังสือรับรองบริษัท" only shows/allows `.pdf` (or, since OS pickers vary, confirm selecting a `.png` there shows the PDF-only error toast and does not start an upload), and "สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ" only allows `.jpg/.jpeg/.png` (selecting a `.pdf` there shows the image-only error toast).
2. Individual vendor: same check for "สำเนาบัตรประชาชน" and "สำเนาทะเบียนบ้าน" (both image-only) vs "ทะเบียนพาณิชย์ (ถ้ามี)" and VAT registration (both PDF-only).
3. Confirm a correctly-typed file still uploads normally (loading toast → success toast → row shows the file), unchanged from before this task.
4. Confirm the "เปลี่ยนไฟล์" (replace) flow on an existing document is also gated by the same per-row rule (it reuses the same `<input>`, so this should work for free — worth a quick check anyway).
