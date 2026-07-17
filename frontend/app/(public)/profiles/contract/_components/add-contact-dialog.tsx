// app/(public)/profiles/contract/_components/add-contact-dialog.tsx
"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputField } from "../../_components/input-field";
import { useAddContactForm } from "../_hooks/use-add-contact-form";
import { Plus } from "lucide-react";

export default function AddContactDialog() {
  const [open, setOpen] = useState(false);
  const { register, control, onSubmit, reset, formState: { errors } } =
    useAddContactForm(() => setOpen(false));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button className="font-bold tracking-wider bg-red-100 text-red-800 h-9 py-2 px-3.5 hover:bg-red-100 hover:text-red-800" />}>
        <Plus />
        <p>เพิ่มผู้ติดต่อ</p>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>เพิ่มผู้ติดต่อ</DialogTitle>
          <DialogDescription>กรอกข้อมูลผู้ติดต่อสำหรับการจัดซื้อจัดจ้าง</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">

          <div className="grid grid-cols-2 gap-4">
            <InputField label="ชื่อผู้ติดต่อ" error={errors.contactName?.message}>
              <Input {...register("contactName")} aria-invalid={!!errors.contactName} className="h-11 rounded-sm" />
            </InputField>

            <InputField label="ตำแหน่ง" error={errors.contactPosition?.message}>
              <Input {...register("contactPosition")} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="เบอร์โทร" error={errors.contactPhone?.message}>
              <Input {...register("contactPhone")} inputMode="numeric" aria-invalid={!!errors.contactPhone} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="อีเมล" error={errors.contactEmail?.message}>
              <Input {...register("contactEmail")} type="email" aria-invalid={!!errors.contactEmail} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="LINE ID" error={errors.lineId?.message}>
              <Input {...register("lineId")} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="ช่องทางติดต่ออื่น ๆ" error={errors.otherContact?.message}>
              <Input {...register("otherContact")} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <Controller
            control={control}
            name="isMainContact"
            render={({ field: { value, onChange, ...field } }) => (
              <Field orientation="horizontal" className="w-fit">
                <Checkbox
                  id="is-main-contact-checkbox"
                  checked={value}
                  onCheckedChange={onChange}
                  className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
                  {...field}
                />
                <FieldLabel htmlFor="is-main-contact-checkbox" className="font-light tracking-wide text-sm cursor-pointer">
                  เป็นผู้ติดต่อหลัก
                </FieldLabel>
              </Field>
            )}
          />

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>ยกเลิก</DialogClose>
            <Button type="submit" className="bg-red-700 text-white hover:bg-red-600">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
