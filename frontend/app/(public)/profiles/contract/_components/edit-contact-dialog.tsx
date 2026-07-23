"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { VendorContact } from "@/lib/vendor/types";
import { useAddContactForm } from "../_hooks/use-add-contact-form";
import { ContactFormFields } from "./contact-form-fields";
import { Pencil } from "lucide-react";

export default function EditContactDialog({ contact }: { contact: VendorContact }) {
  const [open, setOpen] = useState(false);
  const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } =
    useAddContactForm(() => setOpen(false), {
      contactName: contact.contactName ?? "",
      contactPosition: contact.contactPosition ?? "",
      contactPhone: contact.contactPhone ?? "",
      contactEmail: contact.contactEmail ?? "",
      lineId: contact.lineId ?? "",
      otherContact: contact.otherContact ?? "",
      isMainContact: Boolean(contact.isMainContact),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="แก้ไขผู้ติดต่อ" />}>
        <Pencil />
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>แก้ไขผู้ติดต่อ</DialogTitle>
          <DialogDescription>แก้ไขข้อมูลผู้ติดต่อสำหรับการจัดซื้อจัดจ้าง</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <ContactFormFields register={register} control={control} errors={errors} />

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11 ">บันทึกการแก้ไข</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
