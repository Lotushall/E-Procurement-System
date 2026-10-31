"use client";

import { useState } from "react";
import { type ListSortDirection, useListPageControls } from "@/hooks/use-list-page-controls";
import { TOR_STATUSES } from "@/components/tor-status-badge";
import { PROCUREMENT_METHODS } from "@/lib/tender/procurement-methods";
import { useTorsList } from "@/lib/tender/tor/queries/useTorsList";
import type { TorSortBy, TorStatus, TorStatusFilter } from "@/lib/tender/tor/types";

// ต้องตรงกับ id ของคอลัมน์ที่ใช้ SortableHeader ใน columns.tsx — ยกเว้น fiscal_year ที่เรียงได้จาก Select อย่างเดียว
const SORT_BY_VALUES: TorSortBy[] = ["tor_code", "title", "budget_estimate", "fiscal_year", "bidding_end_at"];

// ค่าของ Select เรียงลำดับในตัวกรอง: "latest" = ลำดับ default ของ backend (created_at desc)
export type TorSortValue = "latest" | `${TorSortBy}:${ListSortDirection}`;

// ตัวกรองโครงการ: undefined = ทุกโครงการ, "none" = TOR ที่ไม่สังกัดโครงการ, number = id โครงการ
export type TorTenderProjectFilter = number | "none" | undefined;

function parseStatus(value: string | null): TorStatusFilter {
  return TOR_STATUSES.includes(value as TorStatus) ? (value as TorStatus) : "all";
}

function parsePositiveInt(value: string | null): number | undefined {
  const parsed = Number(value);
  return value && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseProcurementMethod(value: string | null): string | undefined {
  return value && PROCUREMENT_METHODS.includes(value) ? value : undefined;
}

function parseTenderProject(value: string | null): TorTenderProjectFilter {
  return value === "none" ? "none" : parsePositiveInt(value);
}

/**
 * All filters here are staged locally and only sent to the URL (and thus the
 * query) via submitFilters() — nothing auto-applies as the user types or picks
 * an option, so a stray keystroke or accidental select doesn't refetch.
 */
export function useTorListPage() {
  const {
    searchParams,
    updateParams,
    page,
    pageSize,
    pagination,
    setPagination,
    sortBy,
    sortDirection,
    sorting,
    setSorting,
    setSkipSkeleton,
    resolveIsFetching,
  } = useListPageControls({ sortByValues: SORT_BY_VALUES });

  // Applied filters — what's actually driving the current query, read straight from the URL.
  const appliedSearch = searchParams.get("search") ?? "";
  const appliedStatus = parseStatus(searchParams.get("status"));
  const appliedDepartmentId = parsePositiveInt(searchParams.get("department_id"));
  const appliedFiscalYear = parsePositiveInt(searchParams.get("fiscal_year"));
  const appliedProcurementMethod = parseProcurementMethod(searchParams.get("procurement_method"));
  const appliedTenderProjectId = parseTenderProject(searchParams.get("tender_project_id"));

  // Draft filters — what the controls show while the user is still editing them.
  const [search, setSearch] = useState(appliedSearch);
  const [status, setStatus] = useState(appliedStatus);
  const [departmentId, setDepartmentId] = useState(appliedDepartmentId);
  const [fiscalYear, setFiscalYear] = useState(appliedFiscalYear);
  const [procurementMethod, setProcurementMethod] = useState(appliedProcurementMethod);
  const [tenderProjectId, setTenderProjectId] = useState<TorTenderProjectFilter>(appliedTenderProjectId);

  // Draft sort — staged with the filters. When the URL sort changes from elsewhere (a table
  // header click on xl), resync so submitting the filters doesn't revert it.
  const appliedSort: TorSortValue = sortBy ? `${sortBy}:${sortDirection ?? "desc"}` : "latest";
  const [sort, setSort] = useState(appliedSort);
  const [syncedSort, setSyncedSort] = useState(appliedSort);
  if (appliedSort !== syncedSort) {
    setSyncedSort(appliedSort);
    setSort(appliedSort);
  }

  const submitFilters = () => {
    const [nextSortBy, nextSortDirection] = sort === "latest" ? [null, null] : sort.split(":");
    setSkipSkeleton(false);
    updateParams(
      {
        search: search.trim() || null,
        status: status === "all" ? null : status,
        department_id: departmentId ?? null,
        fiscal_year: fiscalYear ?? null,
        procurement_method: procurementMethod ?? null,
        tender_project_id: tenderProjectId ?? null,
        sort_by: nextSortBy,
        sort_direction: nextSortDirection,
      },
      true,
    );
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setDepartmentId(undefined);
    setFiscalYear(undefined);
    setProcurementMethod(undefined);
    setTenderProjectId(undefined);
    setSkipSkeleton(false);
    updateParams(
      {
        search: null,
        status: null,
        department_id: null,
        fiscal_year: null,
        procurement_method: null,
        tender_project_id: null,
      },
      true,
    );
  };

  const list = useTorsList(
    {
      search: appliedSearch || undefined,
      status: appliedStatus === "all" ? undefined : appliedStatus,
      department_id: appliedDepartmentId,
      fiscal_year: appliedFiscalYear,
      procurement_method: appliedProcurementMethod,
      tender_project_id: appliedTenderProjectId,
      sort_by: sortBy,
      sort_direction: sortDirection,
    },
    page,
    pageSize,
  );

  return {
    search,
    setSearch,
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
    sort,
    setSort,
    submitFilters,
    clearFilters,
    appliedSearch,
    // ตัวกรองที่ใช้กับผลลัพธ์อยู่ (ไม่นับค้นหาและการเรียงลำดับ) — ตัวเลขบนปุ่มตัวกรอง / ข้อความตอนไม่พบผลลัพธ์
    activeFilterCount: [
      appliedStatus !== "all",
      appliedDepartmentId !== undefined,
      appliedFiscalYear !== undefined,
      appliedProcurementMethod !== undefined,
      appliedTenderProjectId !== undefined,
    ].filter(Boolean).length,
    visible: list.data?.data ?? [],
    pageCount: list.data?.meta.lastPage ?? 0,
    total: list.data?.meta.total ?? 0,
    pagination,
    setPagination,
    sorting,
    setSorting,
    isPending: list.isPending,
    isFetching: resolveIsFetching(list.isFetching),
    isError: list.isError,
  };
}
