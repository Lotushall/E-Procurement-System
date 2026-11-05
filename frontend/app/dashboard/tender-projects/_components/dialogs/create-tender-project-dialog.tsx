"use client";

import { Controller } from "react-hook-form";
import { format, parse } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle,
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
import { ProcurementMethodCombobox } from "@/components/procurement-method-combobox";
import { formatBudgetDisplay, handleBudgetChange } from "@/lib/form/budget-input";
import { FISCAL_YEAR_CHOICES } from "@/lib/tender/fiscal-year-options";
import { useCreateTenderProjectForm } from "../../_hooks/use-create-tender-project-form";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

function parseDateParam(value: string | undefined): Date | undefined {
    return value ? parse(value, DATE_PARAM_FORMAT, new Date()) : undefined;
}

// ไม่มีปุ่มเปิดในตัว: หน้าเปิดผ่าน FloatingActionButton แล้วคุม open จากข้างนอก
export function CreateTenderProjectDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { data: departmentOptions } = useDepartmentOptions();

    const {
        register, control, watch, setValue, onSubmit, reset, isSubmitting,
        formState: { errors },
    } = useCreateTenderProjectForm(() => onOpenChange(false));

    const projectStartAt = watch("projectStartAt");
    const projectEndAt = watch("projectEndAt");

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next);
                if (!next) reset();
            }}
        >
            <DialogContent className="sm:max-w-2xl scrollbar-rounded">
                <DialogHeader>
                    <DialogTitle>สร้างโครงการจัดซื้อจัดจ้างใหม่</DialogTitle>
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
                                    items={FISCAL_YEAR_CHOICES}
                                    value={value}
                                    onValueChange={(next) => onChange(next ?? "")}
                                >
                                    <SelectTrigger className="w-full h-10! bg-white rounded-sm">
                                        <SelectValue placeholder="เลือกปีงบประมาณ" />
                                    </SelectTrigger>
                                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                                        {FISCAL_YEAR_CHOICES.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </InputField>
                        )}
                    />

                    <InputField label="ระยะเวลาโครงการ" required error={errors.projectStartAt?.message ?? errors.projectEndAt?.message}>
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
                            สร้างโครงการ
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
