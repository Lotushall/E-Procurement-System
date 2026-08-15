"use client";

import { Suspense, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useHasPermission, useHasRole } from "@/lib/auth/permissions";
import { routes } from "@/lib/routes";
import { useUserListPage, type UserStatusFilter, type UserTypeFilter } from "./_hooks/use-user-list-page";
import { UserListSkeleton, UserTableSkeleton } from "./_components/user-list-skeleton";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { createColumns } from "./_components/table/columns";

const TYPE_OPTIONS: { value: UserTypeFilter; label: string }[] = [
  { value: "all", label: "ทุกประเภท" },
  { value: "internal", label: "พนักงานภายใน" },
  { value: "company", label: "นิติบุคคล" },
  { value: "individual", label: "ร้านค้า" },
];

const STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "active", label: "ใช้งานอยู่" },
  { value: "suspended", label: "ระงับการใช้งาน" },
  { value: "inactive", label: "ปิดใช้งาน" },
];

export default function UsersPage() {
  return (
    <Suspense fallback={<UserListSkeleton />}>
      <UsersPageContent />
    </Suspense>
  );
}

function UsersPageContent() {
  useBreadcrumb([{ label: "จัดการผู้ใช้" }]);

  const canCreateUser = useHasPermission("users.create");
  const canUpdateStatus = useHasPermission("users.updateStatus");
  const canUpdateUser = useHasPermission("users.update");
  const canManageRoles = useHasRole("admin");
  const columns = useMemo(
    () => createColumns(canUpdateStatus, canUpdateUser),
    [canUpdateStatus, canUpdateUser],
  );

  const {
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    debouncedSearch,
    visible,
    pageCount,
    total,
    pagination,
    setPagination,
    sorting,
    setSorting,
    isPending,
    isFetching,
    isError,
  } = useUserListPage();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-sm text-gray-600 tracking-wide">
            รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageRoles && (
            <Button variant="outline" render={<Link href={routes.dashboards.user.roles} />} className="h-10">
              จัดการ Role และ Permission
            </Button>
          )}
          {canCreateUser && <CreateUserDialog />}
        </div>
      </div>

      {isPending ? (
        <UserListSkeleton />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ | username | อีเมล"
              className="bg-white h-10 rounded-sm"
            />

            <Select
              items={TYPE_OPTIONS}
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as UserTypeFilter)}
            >
              <SelectTrigger className="sm:w-44 h-10! bg-white rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" alignItemWithTrigger={false}>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={STATUS_OPTIONS}
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as UserStatusFilter)}
            >
              <SelectTrigger className="sm:w-44 h-10! bg-white rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" alignItemWithTrigger={false}>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isError ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง
            </p>
          ) : isFetching ? (
            <UserTableSkeleton />
          ) : visible.length > 0 ? (
            <DataTable
              columns={columns}
              data={visible}
              pageCount={pageCount}
              total={total}
              pagination={pagination}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={setSorting}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {debouncedSearch
                ? "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา"
                : typeFilter !== "all" || statusFilter !== "all"
                  ? "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไขที่เลือก"
                  : "ยังไม่มีผู้ใช้ในระบบ"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
