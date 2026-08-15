"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import type { Permission } from "@/lib/user/management/types";
import { usePermissionForm } from "../_hooks/use-permission-form";

export function PermissionFormDialog({ permission }: { permission?: Permission }) {
  const [open, setOpen] = useState(false);
  const { register, watch, onSubmit, reset, isSubmitting, formState: { errors } } =
    usePermissionForm(() => setOpen(false), permission);

  const namePreview = watch("name");
  const groupPreview = namePreview.includes(".") ? namePreview.split(".")[0] : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          permission ? (
            <Button variant="outline" aria-label="แก้ไข permission" className="size-8 px-1.5 pt-px rounded-md bg-white" />
          ) : (
            <Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10" />
          )
        }
      >
        {permission ? <Pencil className="w-4 h-4 text-gray-500" /> : (<><Plus /><p>สร้าง permission</p></>)}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{permission ? "แก้ไข permission" : "สร้าง permission"}</DialogTitle>
          <DialogDescription>
            {permission
              ? `แก้ไขชื่อและคำอธิบายของ permission "${permission.name}"`
              : "ตั้งชื่อและคำอธิบายสำหรับ permission ใหม่"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <InputField
            label="ชื่อ permission"
            error={errors.name?.message}
            badge={
              groupPreview ? (
                <span className="text-xs text-muted-foreground">จะถูกจัดกลุ่มเป็น: {groupPreview}</span>
              ) : undefined
            }
          >
            <Input
              {...register("name")}
              aria-invalid={!!errors.name}
              className="h-11 rounded-sm"
              placeholder="เช่น reports.export"
            />
          </InputField>

          <InputField label="คำอธิบาย (label)" error={errors.label?.message}>
            <Input
              {...register("label")}
              aria-invalid={!!errors.label}
              className="h-11 rounded-sm"
              placeholder="เช่น ส่งออกรายงาน"
            />
          </InputField>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
              {permission ? "บันทึกการแก้ไข" : "สร้าง permission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
