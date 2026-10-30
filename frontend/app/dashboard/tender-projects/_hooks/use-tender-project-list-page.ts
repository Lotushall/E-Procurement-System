"use client";

import { useState } from "react";
import { type ListSortDirection, useListPageControls } from "@/hooks/use-list-page-controls";
import { useTenderProjectsList } from "@/lib/tender/tender-projects/queries/useTendersProjectList";
import {
  TenderProjectSortBy,
  TenderProjectStatusFilter,
} from "@/lib/tender/tender-projects/types";

// ต้องตรงกับ id ของคอลัมน์ที่ใช้ SortableHeader ใน columns.tsx
const SORT_BY_VALUES: TenderProjectSortBy[] = ["project_code", "name", "budget"];

const STATUS_VALUES: TenderProjectStatusFilter[] = [
  "all",
  "draft",
  "published",
  "closed",
  "completed",
  "cancelled",
  "archived",
];

function parseStatus(value: string | null): TenderProjectStatusFilter {
  return STATUS_VALUES.includes(value as TenderProjectStatusFilter)
    ? (value as TenderProjectStatusFilter)
    : "all";
}

// ค่าของ Select เรียงลำดับในตัวกรอง: "latest" = ลำดับ default ของ backend (created_at desc)
export type TenderProjectSortValue = "latest" | `${TenderProjectSortBy}:${ListSortDirection}`;

function parseDepartmentId(value: string | null): number | undefined {
  const parsed = Number(value);
  return value && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * All filters here are staged locally and only sent to the URL (and thus the
 * query) via submitFilters() — nothing auto-applies as the user types or picks
 * an option, so a stray keystroke or accidental select doesn't refetch.
 */
export function useTenderProjectListPage() {
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
  const appliedDepartmentId = parseDepartmentId(searchParams.get("department_id"));
  const appliedFiscalYear = searchParams.get("fiscal_year") ?? undefined;
  const appliedDateFrom = searchParams.get("date_from") ?? undefined;
  const appliedDateTo = searchParams.get("date_to") ?? undefined;

  // Draft filters — what the controls show while the user is still editing them.
  const [search, setSearch] = useState(appliedSearch);
  const [status, setStatus] = useState(appliedStatus);
  const [departmentId, setDepartmentId] = useState(appliedDepartmentId);
  const [fiscalYear, setFiscalYear] = useState(appliedFiscalYear);
  const [dateFrom, setDateFrom] = useState(appliedDateFrom);
  const [dateTo, setDateTo] = useState(appliedDateTo);

  // Draft sort — staged with the filters (sort Select in the filter sheet / lg filter row). When the
  // URL sort changes from elsewhere (a table header click on xl), resync so submitting the filters
  // doesn't revert it.
  const appliedSort: TenderProjectSortValue = sortBy ? `${sortBy}:${sortDirection ?? "desc"}` : "latest";
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
        date_from: dateFrom ?? null,
        date_to: dateTo ?? null,
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
    setDateFrom(undefined);
    setDateTo(undefined);
    setSkipSkeleton(false);
    updateParams(
      {
        search: null,
        status: null,
        department_id: null,
        fiscal_year: null,
        date_from: null,
        date_to: null,
      },
      true,
    );
  };

  const list = useTenderProjectsList(
    {
      search: appliedSearch || undefined,
      status: appliedStatus === "all" ? undefined : appliedStatus,
      department_id: appliedDepartmentId,
      fiscal_year: appliedFiscalYear,
      date_from: appliedDateFrom,
      date_to: appliedDateTo,
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
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
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
      appliedDateFrom !== undefined || appliedDateTo !== undefined,
    ].filter(Boolean).length,
    stats: list.data?.meta.stats ?? {
      totalCount: 0,
      totalBudget: 0,
      inProgressCount: 0,
      completedCount: 0,
    },
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
