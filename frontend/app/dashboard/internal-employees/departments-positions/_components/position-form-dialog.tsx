"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import { usePositionForm } from "../_hooks/use-position-form";

export default function PositionFormDialog() {
    const [open, setOpen] = useState(false);
    const { register, onSubmit, reset, isSubmitting, formState: { errors } } = usePositionForm(() => setOpen(false));

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset();
            }}
        >
            <DialogTrigger render={<Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10" />}>
                <Plus />
                <p>เพิ่มตำแหน่ง</p>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>สร้างตำแหน่ง</DialogTitle>
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
                            สร้างตำแหน่ง
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
