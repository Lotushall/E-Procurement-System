"use client";

import { useState } from "react";
import { useListPageControls } from "@/hooks/use-list-page-controls";
import { useTenderProjectsList } from "@/lib/tender/tender-projects/queries/useTendersProjectList";
import {
  TenderProjectSortBy,
  TenderProjectStatusFilter,
} from "@/lib/tender/tender-projects/types";

const SORT_BY_VALUES: TenderProjectSortBy[] = [
  "projectCode",
  "name",
  "budget",
  "department",
  "personInCharge",
  "createdBy",
  "procurementMethod",
  "fiscalYear",
  "projectStartAt",
  "projectEndAt",
  "status",
];

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

  const submitFilters = () => {
    setSkipSkeleton(false);
    updateParams(
      {
        search: search.trim() || null,
        status: status === "all" ? null : status,
        department_id: departmentId ?? null,
        fiscal_year: fiscalYear ?? null,
        date_from: dateFrom ?? null,
        date_to: dateTo ?? null,
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
    appliedSearch || undefined,
    appliedStatus === "all" ? undefined : appliedStatus,
    appliedDepartmentId,
    appliedFiscalYear,
    appliedDateFrom,
    appliedDateTo,
    sortBy,
    sortDirection,
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
    submitFilters,
    clearFilters,
    appliedSearch,
    appliedStatus,
    appliedDepartmentId,
    appliedFiscalYear,
    appliedDateFrom,
    appliedDateTo,
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
