"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VendorDocument } from "@/lib/vendor/types";
import { FileText, Paperclip, Trash2 } from "lucide-react";

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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log({ documentType, file });
    setSelectedFile(file);
    e.target.value = "";
  };

  const handleDelete = () => {
    console.log({ action: "delete", documentType, existingDocument });
    setSelectedFile(null);
  };

  const fileName = selectedFile?.name ?? existingDocument?.fileName;
  const fileSize = selectedFile ? formatFileSize(selectedFile.size) : undefined;
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
        <p className="flex items-center text-xs text-gray-600 font-thin tracking-wide truncate">
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
  );
}
