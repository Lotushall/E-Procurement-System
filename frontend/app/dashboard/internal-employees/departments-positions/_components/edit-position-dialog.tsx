"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import type { Position } from "@/lib/internal-profiles/types";
import { useEditPositionForm } from "../_hooks/use-edit-position-form";

export default function EditPositionDialog({ position }: { position: Position }) {
    const [open, setOpen] = useState(false);
    const initialValues = { name: position.name };

    const { register, onSubmit, reset, isSubmitting, formState: { errors } } =
        useEditPositionForm(position.id, () => setOpen(false), initialValues);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset(initialValues);
            }}
        >
            <DialogTrigger render={<Button variant="outline" aria-label="แก้ไขตำแหน่ง" className="size-8 px-1.5 pt-px rounded-md bg-white" />}>
                <Pencil className="w-4 h-4 text-gray-500" />
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>แก้ไขตำแหน่ง</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <InputField label="ชื่อตำแหน่ง" error={errors.name?.message}>
                        <Input
                            {...register("name")}
                            aria-invalid={!!errors.name}
                            className="h-10 rounded-sm"
                        />
                    </InputField>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                            บันทึกการแก้ไข
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
