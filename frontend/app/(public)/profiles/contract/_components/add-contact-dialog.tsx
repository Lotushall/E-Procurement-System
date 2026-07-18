// app/(public)/profiles/contract/_components/add-contact-dialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAddContactForm } from "../_hooks/use-add-contact-form";
import { ContactFormFields } from "./contact-form-fields";
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
          <ContactFormFields register={register} control={control} errors={errors} />

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>ยกเลิก</DialogClose>
            <Button type="submit" className="bg-red-700 text-white hover:bg-red-600">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
