"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { format, parse } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputField } from "@/components/input-field";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DepartmentSelect } from "@/components/department-select";
import { InternalProfileCombobox } from "@/components/internal-profile-combobox";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { useCreateTenderProjectForm } from "../_hooks/use-create-tender-project-form";
import { ProcurementMethodCombobox } from "./procurement-method-combobox";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

function parseDateParam(value: string | undefined): Date | undefined {
    return value ? parse(value, DATE_PARAM_FORMAT, new Date()) : undefined;
}

const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;
const FISCAL_YEAR_OPTIONS: { value: string; label: string }[] = Array.from(
    { length: 5 },
    (_, i) => {
        const year = CURRENT_BUDDHIST_YEAR + 1 - i;
        return { value: String(year), label: `ปีงบประมาณ ${year}` };
    },
);

export function CreateTenderProjectDialog() {
    const [open, setOpen] = useState(false);
    const { data: departmentOptions } = useDepartmentOptions();

    const {
        register, control, watch, setValue, onSubmit, reset, isSubmitting,
        formState: { errors },
    } = useCreateTenderProjectForm(() => setOpen(false));

    const projectStartAt = watch("projectStartAt");
    const projectEndAt = watch("projectEndAt");

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
                    <Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10 flex-1" />
                }
            >
                <Plus />
                <p>สร้างโครงการใหม่</p>
            </DialogTrigger>

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>สร้างโครงการจัดซื้อจัดจ้างใหม่</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <InputField label="ชื่อโครงการ" error={errors.name?.message}>
                        <Input {...register("name")} aria-invalid={!!errors.name} className="h-10 rounded-sm" />
                    </InputField>

                    <InputField label="รายละเอียด" error={errors.description?.message}>
                        <Textarea
                            {...register("description")}
                            aria-invalid={!!errors.description}
                            className="rounded-sm"
                        />
                    </InputField>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <InputField label="งบประมาณ" error={errors.budget?.message}>
                            <Input
                                {...register("budget")}
                                type="number"
                                step="0.01"
                                min="0"
                                aria-invalid={!!errors.budget}
                                className="h-10 rounded-sm"
                            />
                        </InputField>

                        <Controller
                            control={control}
                            name="departmentId"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="แผนก" error={errors.departmentId?.message}>
                                    <DepartmentSelect
                                        departments={departmentOptions ?? []}
                                        value={value}
                                        onValueChange={onChange}
                                        ariaInvalid={!!errors.departmentId}
                                    />
                                </InputField>
                            )}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={control}
                            name="personInChargeId"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="ผู้รับผิดชอบ" error={errors.personInChargeId?.message}>
                                    <InternalProfileCombobox
                                        value={value ?? ""}
                                        onValueChange={onChange}
                                        ariaInvalid={!!errors.personInChargeId}
                                    />
                                </InputField>
                            )}
                        />

                        <Controller
                            control={control}
                            name="procurementMethod"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="วิธีจัดซื้อ" error={errors.procurementMethod?.message}>
                                    <ProcurementMethodCombobox value={value} onValueChange={onChange} />
                                </InputField>
                            )}
                        />
                    </div>

                    <Controller
                        control={control}
                        name="fiscalYear"
                        render={({ field: { value, onChange } }) => (
                            <InputField label="ปีงบประมาณ" error={errors.fiscalYear?.message}>
                                <Select
                                    items={FISCAL_YEAR_OPTIONS}
                                    value={value}
                                    onValueChange={(next) => onChange(next ?? "")}
                                >
                                    <SelectTrigger className="w-full h-10! bg-white rounded-sm">
                                        <SelectValue placeholder="เลือกปีงบประมาณ" />
                                    </SelectTrigger>
                                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                                        {FISCAL_YEAR_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </InputField>
                        )}
                    />

                    <InputField label="ระยะเวลาโครงการ" error={errors.projectEndAt?.message}>
                        <Popover>
                            <PopoverTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10! w-full justify-start gap-2 bg-white font-normal focus:bg-white! aria-expanded:bg-white! hover:bg-white!"
                                    >
                                        <CalendarIcon className="size-4 shrink-0 text-gray-500" />
                                        {projectStartAt || projectEndAt ? (
                                            <span className="truncate">
                                                {projectStartAt
                                                    ? format(parseDateParam(projectStartAt)!, "d MMM yyyy", { locale: th })
                                                    : "..."}
                                                {" ถึง "}
                                                {projectEndAt
                                                    ? format(parseDateParam(projectEndAt)!, "d MMM yyyy", { locale: th })
                                                    : "..."}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">เลือกระยะเวลาโครงการ</span>
                                        )}
                                    </Button>
                                }
                            />
                            <PopoverContent align="start" className="w-auto p-0">
                                <Calendar
                                    mode="range"
                                    locale={th}
                                    captionLayout="dropdown"
                                    numberOfMonths={2}
                                    defaultMonth={parseDateParam(projectStartAt)}
                                    selected={{ from: parseDateParam(projectStartAt), to: parseDateParam(projectEndAt) }}
                                    onSelect={(range) => {
                                        setValue("projectStartAt", range?.from ? format(range.from, DATE_PARAM_FORMAT) : "", {
                                            shouldValidate: true,
                                        });
                                        setValue("projectEndAt", range?.to ? format(range.to, DATE_PARAM_FORMAT) : "", {
                                            shouldValidate: true,
                                        });
                                    }}
                                />
                                <div className="flex justify-end border-t border-border p-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setValue("projectStartAt", "");
                                            setValue("projectEndAt", "");
                                        }}
                                    >
                                        ล้างค่า
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </InputField>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>
                            ยกเลิก
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                            สร้างโครงการ
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
