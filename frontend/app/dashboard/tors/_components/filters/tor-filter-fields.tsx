"use client"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DepartmentSelect } from "@/components/department-select";
import { TOR_STATUS_STYLE, TOR_STATUSES } from "@/components/tor-status-badge";
import type { Department } from "@/lib/internal-profiles/types";
import { FISCAL_YEAR_OPTIONS } from "@/lib/tender/fiscal-year-options";
import { PROCUREMENT_METHODS } from "@/lib/tender/procurement-methods";
import type { TenderProjectOption } from "@/lib/tender/tender-projects/types";
import type { TorStatusFilter } from "@/lib/tender/tor/types";
import type { TorTenderProjectFilter } from "../../_hooks/use-tor-list-page";
import { TenderProjectFilterCombobox } from "./tender-project-filter-combobox";

const ALL_DEPARTMENTS_OPTION = { value: "all", label: "ทุกหน่วยงาน" };

const STATUS_OPTIONS: { value: TorStatusFilter; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    ...TOR_STATUSES.map((status) => ({ value: status, label: TOR_STATUS_STYLE[status].label })),
];

const PROCUREMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "ทุกวิธีจัดซื้อจัดจ้าง" },
    ...PROCUREMENT_METHODS.map((method) => ({ value: method, label: method })),
];

export interface TorFilterFieldsProps {
    departments: Department[];
    tenderProjects: TenderProjectOption[];
    status: TorStatusFilter;
    setStatus: (value: TorStatusFilter) => void;
    departmentId: number | undefined;
    setDepartmentId: (value: number | undefined) => void;
    fiscalYear: number | undefined;
    setFiscalYear: (value: number | undefined) => void;
    procurementMethod: string | undefined;
    setProcurementMethod: (value: string | undefined) => void;
    tenderProjectId: TorTenderProjectFilter;
    setTenderProjectId: (value: TorTenderProjectFilter) => void;
}

// ใช้ทั้งในแถวตัวกรองบนจอ lg ขึ้นไป และใน sheet ตัวกรองบนจอเล็ก (เต็มความกว้างเมื่อเล็กกว่า lg)
export function TorFilterFields({
    departments,
    tenderProjects,
    status,
    setStatus,
    departmentId,
    setDepartmentId,
    fiscalYear,
    setFiscalYear,
    procurementMethod,
    setProcurementMethod,
    tenderProjectId,
    setTenderProjectId,
    inSheet = false,
}: TorFilterFieldsProps & {
    // ใน sheet: ช่องที่พิมพ์ค้นหาได้ใช้ inlineSearch แทนช่องค้นหาใน popup ที่ดึง focus ออกนอก sheet
    inSheet?: boolean;
}) {
    return (
        <>
            <Select
                items={STATUS_OPTIONS}
                value={status === "all" ? null : status}
                onValueChange={(value) => setStatus((value ?? "all") as TorStatusFilter)}
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
                placeholder="หน่วยงาน"
                className="lg:w-44"
                inlineSearch={inSheet}
            />

            <Select
                items={FISCAL_YEAR_OPTIONS}
                value={fiscalYear !== undefined ? String(fiscalYear) : null}
                onValueChange={(value) => setFiscalYear(value && value !== "all" ? Number(value) : undefined)}
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

            <Select
                items={PROCUREMENT_METHOD_OPTIONS}
                value={procurementMethod ?? null}
                onValueChange={(value) => setProcurementMethod(value && value !== "all" ? value : undefined)}
            >
                <SelectTrigger className="w-full lg:w-56 h-10! bg-white rounded-sm">
                    <SelectValue placeholder="วิธีจัดซื้อจัดจ้าง" />
                </SelectTrigger>
                <SelectContent side="bottom" alignItemWithTrigger={false}>
                    {PROCUREMENT_METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <TenderProjectFilterCombobox
                projects={tenderProjects}
                value={tenderProjectId}
                onValueChange={setTenderProjectId}
                className="lg:w-60"
                inlineSearch={inSheet}
            />
        </>
    );
}
