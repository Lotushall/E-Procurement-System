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
        toast.dismiss(toastId);
        toast.message("ยกเลิกการอัปโหลดแล้ว");
      } else {
        toast.error(getErrorMessage(error), { id: toastId });
      }
    } finally {
      setSelectedFile(null);
      setUploadProgress(null);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
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
            variant="destructive"
            size="icon-xs"
            onClick={handleCancelUpload}
            aria-label="ยกเลิกการอัปโหลด"
            className="absolute top-2 right-2"
          >
            <X />
          </Button>
          <Progress
            value={uploadProgress ?? 0}
            aria-label="ความคืบหน้าการอัปโหลด"
            className="absolute inset-x-0 bottom-0 h-1 w-full rounded-none bg-transparent"
          />
        </>
      )}
    </div>
  );
}
