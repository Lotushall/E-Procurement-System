"use client"

import { format, parse } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DepartmentSelect } from "@/components/department-select";
import type { Department } from "@/lib/internal-profiles/types";
import { FISCAL_YEAR_OPTIONS } from "@/lib/tender/fiscal-year-options";
import type { TenderProjectStatusFilter } from "@/lib/tender/tender-projects/types";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

function parseDateParam(value: string | undefined): Date | undefined {
    return value ? parse(value, DATE_PARAM_FORMAT, new Date()) : undefined;
}

const ALL_DEPARTMENTS_OPTION = { value: "all", label: "ทุกหน่วยงาน" };

const STATUS_OPTIONS: { value: TenderProjectStatusFilter; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "draft", label: "ร่าง" },
    { value: "published", label: "กำลังดำเนินการ" },
    { value: "closed", label: "ปิดรับซอง" },
    { value: "completed", label: "เสร็จสิ้น" },
    { value: "cancelled", label: "ยกเลิก" },
    { value: "archived", label: "เก็บถาวร" },
];

export interface TenderProjectFilterFieldsProps {
    departments: Department[];
    status: TenderProjectStatusFilter;
    setStatus: (value: TenderProjectStatusFilter) => void;
    departmentId: number | undefined;
    setDepartmentId: (value: number | undefined) => void;
    fiscalYear: string | undefined;
    setFiscalYear: (value: string | undefined) => void;
    dateFrom: string | undefined;
    setDateFrom: (value: string | undefined) => void;
    dateTo: string | undefined;
    setDateTo: (value: string | undefined) => void;
}

// ใช้ทั้งในแถวตัวกรองบนจอ lg ขึ้นไป และใน sheet ตัวกรองบนจอเล็ก (เต็มความกว้างเมื่อเล็กกว่า lg)
export function TenderProjectFilterFields({
    departments,
    status,
    setStatus,
    departmentId,
    setDepartmentId,
    fiscalYear,
    setFiscalYear,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    calendarMonths = 2,
    inSheet = false,
}: TenderProjectFilterFieldsProps & {
    calendarMonths?: number;
    // ใน sheet: ช่องแผนกพิมพ์ค้นหาในช่องเอง (inlineSearch) แทนช่องค้นหาใน popup ที่ดึง focus ออกนอก sheet
    inSheet?: boolean;
}) {
    return (
        <>
            <Select
                items={STATUS_OPTIONS}
                value={status === "all" ? null : status}
                onValueChange={(value) => setStatus((value ?? "all") as TenderProjectStatusFilter)}
            >
                <SelectTrigger className="w-full lg:w-44 h-10! bg-white rounded-sm">
                    <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent side="bottom" alignItemWithTrigger={false}>
                    {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <DepartmentSelect
                departments={departments}
                value={departmentId !== undefined ? String(departmentId) : "all"}
                onValueChange={(value) => setDepartmentId(value === "all" ? undefined : Number(value))}
                allOption={ALL_DEPARTMENTS_OPTION}
                placeholder="แผนก"
                className="lg:w-44"
                inlineSearch={inSheet}
            />

            <Select
                items={FISCAL_YEAR_OPTIONS}
                value={fiscalYear ?? null}
                onValueChange={(value) => setFiscalYear(value && value !== "all" ? value : undefined)}
            >
                <SelectTrigger className="w-full lg:w-44 h-10! bg-white rounded-sm">
                    <SelectValue placeholder="ปีงบประมาณ" />
                </SelectTrigger>
                <SelectContent side="bottom" alignItemWithTrigger={false}>
                    {FISCAL_YEAR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger
                    render={
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10! justify-start gap-2 bg-white font-normal lg:w-60  focus:bg-white!  aria-expanded:bg-white! hover:bg-white!"
                        >
                            <CalendarIcon className="size-4 shrink-0 text-gray-500" />
                            {dateFrom || dateTo ? (
                                <span className="truncate">
                                    {dateFrom
                                        ? format(parseDateParam(dateFrom)!, "d MMM yyyy", { locale: th })
                                        : "..."}
                                    {" ถึง "}
                                    {dateTo
                                        ? format(parseDateParam(dateTo)!, "d MMM yyyy", { locale: th })
                                        : "..."}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">ระยะเวลาโครงการ</span>
                            )}
                        </Button>
                    }
                />
                <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                        mode="range"
                        locale={th}
                        captionLayout="dropdown"
                        numberOfMonths={calendarMonths}
                        defaultMonth={parseDateParam(dateFrom)}
                        selected={{ from: parseDateParam(dateFrom), to: parseDateParam(dateTo) }}
                        onSelect={(range) => {
                            setDateFrom(range?.from ? format(range.from, DATE_PARAM_FORMAT) : undefined);
                            setDateTo(range?.to ? format(range.to, DATE_PARAM_FORMAT) : undefined);
                        }}
                    />
                    <div className="flex justify-end border-t border-border p-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setDateFrom(undefined);
                                setDateTo(undefined);
                            }}
                        >
                            ล้างค่า
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </>
    );
}
