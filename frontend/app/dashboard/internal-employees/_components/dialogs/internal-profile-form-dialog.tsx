"use client";

import { type ChangeEvent } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InputField } from "@/components/input-field";
import { formatPhone } from "@/lib/utils";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { usePositionOptions } from "@/lib/internal-profiles/queries/usePositionOptions";
import { DepartmentSelect } from "@/components/department-select";
import { PositionSelect } from "@/components/position-select";
import { useInternalProfileForm } from "../../_hooks/use-internal-profile-form";

const PREFIX_OPTIONS = ["นาย", "นาง"] as const;

// ไม่มีปุ่มเปิดในตัว: หน้าเปิดผ่านเมนูของ FloatingActionButton แล้วคุม open จากข้างนอก
export default function InternalProfileFormDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { data: departments } = useDepartmentOptions();
    const { data: positions } = usePositionOptions();
    const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } = useInternalProfileForm(() => onOpenChange(false));

    function handlePhoneChange(onChange: (value: string) => void) {
        return (e: ChangeEvent<HTMLInputElement>) => onChange(formatPhone(e.target.value));
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next);
                if (!next) reset();
            }}
        >
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>สร้างพนักงานภายใน</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Controller
                            control={control}
                            name="prefix"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="คำนำหน้า" error={errors.prefix?.message}>
                                    <Select
                                        items={PREFIX_OPTIONS.map((p) => ({ value: p, label: p }))}
                                        value={value}
                                        onValueChange={(next) => {
                                            if (next !== null) onChange(next);
                                        }}
                                    >
                                        <SelectTrigger className="w-full h-10! rounded-sm" aria-invalid={!!errors.prefix}>
                                            <SelectValue placeholder="เลือกคำนำหน้า" />
                                        </SelectTrigger>
                                        <SelectContent side="bottom" alignItemWithTrigger={false}>
                                            <SelectGroup>
                                                {PREFIX_OPTIONS.map((p) => (
                                                    <SelectItem key={p} value={p}>
                                                        {p}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </InputField>
                            )}
                        />

                        <InputField label="ชื่อ" error={errors.firstname?.message}>
                            <Input
                                {...register("firstname")}
                                aria-invalid={!!errors.firstname}
                                className="h-10 rounded-sm"
                            />
                        </InputField>

                        <InputField label="นามสกุล" error={errors.lastname?.message}>
                            <Input
                                {...register("lastname")}
                                aria-invalid={!!errors.lastname}
                                className="h-10 rounded-sm"
                            />
                        </InputField>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <InputField label="รหัสพนักงาน" error={errors.employeeNo?.message}>
                            <Input
                                {...register("employeeNo")}
                                aria-invalid={!!errors.employeeNo}
                                className="h-10 rounded-sm"
                            />
                        </InputField>

                        <InputField label="เบอร์โทร" error={errors.phone?.message}>
                            <Controller
                                control={control}
                                name="phone"
                                render={({ field: { value, onChange, ...field } }) => (
                                    <Input
                                        value={formatPhone(value ?? "")}
                                        onChange={handlePhoneChange(onChange)}
                                        inputMode="numeric"
                                        maxLength={12}
                                        placeholder="0XX-XXX-XXXX"
                                        aria-invalid={!!errors.phone}
                                        className="h-10 rounded-sm"
                                        {...field}
                                    />
                                )}
                            />
                        </InputField>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={control}
                            name="departmentId"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="แผนก" error={errors.departmentId?.message}>
                                    <DepartmentSelect
                                        departments={departments ?? []}
                                        value={value ?? ""}
                                        ariaInvalid={!!errors.departmentId}
                                        onValueChange={onChange}
                                    />
                                </InputField>
                            )}
                        />

                        <Controller
                            control={control}
                            name="positionId"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="ตำแหน่ง" error={errors.positionId?.message}>
                                    <PositionSelect
                                        positions={positions ?? []}
                                        value={value ?? ""}
                                        ariaInvalid={!!errors.positionId}
                                        onValueChange={onChange}
                                    />
                                </InputField>
                            )}
                        />
                    </div>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                            สร้างพนักงาน
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
