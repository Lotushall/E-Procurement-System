"use client";

import { useState, type ChangeEvent, type ReactElement, type ReactNode } from "react";
import { Controller } from "react-hook-form";
import { format, parse } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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
import type { TenderProjects } from "@/lib/tender/tender-projects/types";
import { toFormValues, useEditTenderProjectForm } from "../../_hooks/use-edit-tender-project-form";
import { ProcurementMethodCombobox } from "./procurement-method-combobox";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

function parseDateParam(value: string | undefined): Date | undefined {
    return value ? parse(value, DATE_PARAM_FORMAT, new Date()) : undefined;
}

// Keeps at most one "." and caps the decimal part at 2 digits (matches the budget schema's precision).
function sanitizeBudgetInput(input: string): string {
    const cleaned = input.replace(/[^\d.]/g, "");
    const dotIndex = cleaned.indexOf(".");
    if (dotIndex === -1) return cleaned;

    const intPart = cleaned.slice(0, dotIndex);
    const decPart = cleaned.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
    return `${intPart}.${decPart}`;
}

function formatBudgetDisplay(raw: string): string {
    if (raw === "") return "";
    const [intPart, decPart] = raw.split(".");
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
}

// Reformatting on every keystroke shifts the comma positions, which would
// otherwise throw a mid-edit cursor to the end of the input — this keeps it
// pinned to the same digit by counting digits (not raw characters) to its left.
function handleBudgetChange(onChange: (value: string) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const cursorPos = input.selectionStart ?? input.value.length;
        const digitsBeforeCursor = input.value.slice(0, cursorPos).replace(/[^\d.]/g, "").length;

        const raw = sanitizeBudgetInput(input.value);
        onChange(raw);

        requestAnimationFrame(() => {
            const formatted = formatBudgetDisplay(raw);
            let count = 0;
            let pos = formatted.length;
            for (let i = 0; i < formatted.length; i++) {
                if (/[\d.]/.test(formatted[i])) count++;
                if (count === digitsBeforeCursor) {
                    pos = i + 1;
                    break;
                }
            }
            if (digitsBeforeCursor === 0) pos = 0;
            input.setSelectionRange(pos, pos);
        });
    };
}

const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;
const FISCAL_YEAR_OPTIONS: { value: string; label: string }[] = Array.from(
    { length: 5 },
    (_, i) => {
        const year = CURRENT_BUDDHIST_YEAR + 1 - i;
        return { value: String(year), label: `ปีงบประมาณ ${year}` };
    },
);

export function EditTenderProjectDialog({
    project,
    trigger,
    triggerChildren,
}: {
    project: TenderProjects;
    trigger: ReactElement;
    triggerChildren: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const { data: departmentOptions } = useDepartmentOptions();

    const {
        register, control, watch, setValue, onSubmit, reset, isSubmitting,
        formState: { errors },
    } = useEditTenderProjectForm(project, () => setOpen(false));

    const projectStartAt = watch("projectStartAt");
    const projectEndAt = watch("projectEndAt");

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                // re-seed ทั้งขาเปิดและขาปิด: เปิดมาเห็นค่าล่าสุดเสมอ
                // และปิดแล้วค่าที่แก้ค้างไว้ไม่ตกค้างไปรอบหน้า
                reset(toFormValues(project));
            }}
        >
            <DialogTrigger render={trigger}>{triggerChildren}</DialogTrigger>

            <DialogContent className="sm:max-w-2xl scrollbar-rounded">
                <DialogHeader>
                    <DialogTitle>แก้ไขโครงการจัดซื้อจัดจ้าง</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <InputField label="ชื่อโครงการ" required error={errors.name?.message}>
                        <Input {...register("name")} aria-invalid={!!errors.name} className="h-10 rounded-sm" />
                    </InputField>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={control}
                            name="departmentId"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="แผนก" required error={errors.departmentId?.message}>
                                    <DepartmentSelect
                                        departments={departmentOptions ?? []}
                                        value={value}
                                        onValueChange={onChange}
                                        ariaInvalid={!!errors.departmentId}
                                    />
                                </InputField>
                            )}
                        />

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
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <InputField label="งบประมาณ" required error={errors.budget?.message}>
                            <Controller
                                control={control}
                                name="budget"
                                render={({ field: { value, onChange, ...field } }) => (
                                    <Input
                                        value={formatBudgetDisplay(value ?? "")}
                                        onChange={handleBudgetChange(onChange)}
                                        inputMode="decimal"
                                        aria-invalid={!!errors.budget}
                                        className="h-10 rounded-sm"
                                        {...field}
                                    />
                                )}
                            />
                        </InputField>

                        <Controller
                            control={control}
                            name="procurementMethod"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="วิธีจัดซื้อ" required error={errors.procurementMethod?.message}>
                                    <ProcurementMethodCombobox ariaInvalid={!!errors.procurementMethod} value={value} onValueChange={onChange} />
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

                    <InputField label="ระยะเวลาโครงการ" required error={errors.projectEndAt?.message}>
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

                    <InputField label="รายละเอียด" error={errors.description?.message}>
                        <Textarea
                            {...register("description")}
                            aria-invalid={!!errors.description}
                            className="rounded-sm"
                        />
                    </InputField>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>
                            ยกเลิก
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                            บันทึกการแก้ไข
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
