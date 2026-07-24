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
