"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatPhone, getInitials } from "@/lib/utils";
import type { VendorContact } from "@/lib/vendor/profile/types";
import { Eye, Mail, MessageCircle, MoreHorizontal, Phone } from "lucide-react";

export default function ViewContactDialog({ contact }: { contact: VendorContact }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="ดูรายละเอียดผู้ติดต่อ" className="md:hidden" />}>
        <Eye />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>รายละเอียดผู้ติดต่อ</DialogTitle>
          <DialogDescription>ข้อมูลผู้ติดต่อสำหรับการจัดซื้อจัดจ้าง</DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3.5">
          <div className={cn("flex items-center justify-center shrink-0 font-bold text-white w-11 h-11 rounded-md", contact.isMainContact ? "bg-red-700" : "bg-gray-200")}>
            {getInitials(contact.contactName)}
          </div>

          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="font-bold tracking-wide capitalize">{contact.contactName}</p>

              {contact.isMainContact && (
                <Badge className="bg-red-100 text-red-800 tracking-wider">
                  ผู้ติดต่อหลัก
                </Badge>
              )}
            </div>

            {contact.contactPosition && (
              <p className="text-sm text-gray-600 font-thin tracking-wide capitalize">
                {contact.contactPosition}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-600 font-thin tracking-wide">
          {contact.contactPhone && (
            <div className="flex items-center gap-2">
              <Phone size={14} className="shrink-0 text-gray-400" />
              {formatPhone(contact.contactPhone)}
            </div>
          )}

          {contact.contactEmail && (
            <div className="flex items-center gap-2 min-w-0">
              <Mail size={14} className="shrink-0 text-gray-400" />
              <span className="break-all">{contact.contactEmail}</span>
            </div>
          )}

          {contact.lineId && (
            <div className="flex items-center gap-2">
              <MessageCircle size={14} className="shrink-0 text-gray-400" />
              {contact.lineId}
            </div>
          )}

          {contact.otherContact && (
            <div className="flex items-center gap-2">
              <MoreHorizontal size={14} className="shrink-0 text-gray-400" />
              {contact.otherContact}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ปิด</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
