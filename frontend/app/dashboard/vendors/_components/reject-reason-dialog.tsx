"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function RejectReasonDialog({
  trigger,
  triggerChildren,
  title,
  description,
  isPending,
  onConfirm,
}: {
  trigger: ReactElement;
  triggerChildren: ReactNode;
  title: string;
  description: string;
  isPending: boolean;
  onConfirm: (remark: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState("");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setRemark("");
  };

  const handleConfirm = () => {
    onConfirm(remark.trim());
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{triggerChildren}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="ระบุเหตุผลที่ปฏิเสธ"
          rows={3}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={!remark.trim() || isPending}
            onClick={handleConfirm}
          >
            ยืนยันปฏิเสธ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
