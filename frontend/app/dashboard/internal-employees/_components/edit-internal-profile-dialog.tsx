"use client";

import { Pencil } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { InputField } from "@/components/input-field";
import { formatPhone } from "@/lib/utils";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { usePositionOptions } from "@/lib/internal-profiles/queries/usePositionOptions";
import { useInternalProfileDetail } from "@/lib/internal-profiles/queries/useInternalProfileDetail";
import { DepartmentSelect } from "@/components/department-select";
import { PositionSelect } from "@/components/position-select";
import { useEditInternalProfileForm } from "../_hooks/use-edit-internal-profile-form";

const PREFIX_OPTIONS = ["นาย", "นาง"] as const;

export default function EditInternalProfileDialog({ id }: { id: number }) {
    const [open, setOpen] = useState(false);
    const { data: departments } = useDepartmentOptions();
    const { data: positions } = usePositionOptions();
    const { data: profile, isPending } = useInternalProfileDetail(id, open);

    const initialValues = {
        prefix: profile?.prefix ?? "",
        firstname: profile?.firstname ?? "",
        lastname: profile?.lastname ?? "",
        employeeNo: profile?.employeeNo ?? "",
        departmentId: profile?.department ? String(profile.department.id) : "",
        positionId: profile?.position ? String(profile.position.id) : "",
        phone: profile?.phone ?? "",
    };

    const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } =
        useEditInternalProfileForm(id, () => setOpen(false), initialValues);

    function handlePhoneChange(onChange: (value: string) => void) {
        return (e: ChangeEvent<HTMLInputElement>) => onChange(formatPhone(e.target.value));
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset(initialValues);
            }}
        >
            <DialogTrigger render={<Button variant="outline" aria-label="แก้ไขพนักงาน" className="size-8 px-1.5 pt-px rounded-md bg-white" />}>
                <Pencil className="w-4 h-4 text-gray-500" />
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>แก้ไขข้อมูลพนักงาน</DialogTitle>
                </DialogHeader>

                {isPending ? (
                    <div className="flex justify-center py-8">
                        <Spinner className="size-6" />
                    </div>
                ) : (
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
                                บันทึกการแก้ไข
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
