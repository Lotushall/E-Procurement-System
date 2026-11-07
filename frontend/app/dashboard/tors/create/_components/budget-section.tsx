"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProcurementMethodCombobox } from "@/components/procurement-method-combobox";
import { formatBudgetDisplay, handleBudgetChange } from "@/lib/form/budget-input";
import { FISCAL_YEAR_CHOICES } from "@/lib/tender/fiscal-year-options";
import type { CreateTorFormValues } from "../_hooks/use-create-tor-form";
import { FormSection } from "./form-section";

export function BudgetSection() {
    const { control, formState: { errors } } = useFormContext<CreateTorFormValues>();

    return (
        <FormSection step={2} title="งบประมาณและวิธีจัดซื้อจัดจ้าง">
            <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="ราคากลาง (บาท)" required error={errors.budgetEstimate?.message}>
                    <Controller
                        control={control}
                        name="budgetEstimate"
                        render={({ field: { value, onChange, ...field } }) => (
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
                                    ฿
                                </span>
                                <Input
                                    value={formatBudgetDisplay(value ?? "")}
                                    onChange={handleBudgetChange(onChange)}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    aria-invalid={!!errors.budgetEstimate}
                                    className="h-10 rounded-sm pl-7 text-right"
                                    {...field}
                                />
                            </div>
                        )}
                    />
                </InputField>

                <Controller
                    control={control}
                    name="fiscalYear"
                    render={({ field: { value, onChange } }) => (
                        <InputField label="ปีงบประมาณ" required error={errors.fiscalYear?.message}>
                            <Select
                                items={FISCAL_YEAR_CHOICES}
                                value={value}
                                onValueChange={(next) => onChange(next ?? "")}
                            >
                                <SelectTrigger className="w-full h-10! bg-white rounded-sm" aria-invalid={!!errors.fiscalYear}>
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
            </div>

            <Controller
                control={control}
                name="procurementMethod"
                render={({ field: { value, onChange } }) => (
                    <InputField label="วิธีจัดซื้อจัดจ้าง" required error={errors.procurementMethod?.message}>
                        <ProcurementMethodCombobox
                            value={value}
                            onValueChange={onChange}
                            ariaInvalid={!!errors.procurementMethod}
                        />
                    </InputField>
                )}
            />
        </FormSection>
    );
}
