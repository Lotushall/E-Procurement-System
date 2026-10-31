"use client";

import { Suspense, useMemo } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { FloatingActionButton, type FloatingAction } from "@/components/floating-action-button";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useAuthPermissions } from "@/lib/auth/permissions";
import { routes } from "@/lib/routes";
import { useUserListPage } from "./_hooks/use-user-list-page";
import { CARD_GRID_CLASS, UserListSkeleton, UserTableSkeleton } from "./_components/user-list-skeleton";
import { UserFilterBar } from "./_components/filters/user-filter-bar";
import { createColumns } from "./_components/table/columns";
import { UserCard } from "./_components/table/user-card";

function UsersPageContent() {
  useBreadcrumb([{ label: "จัดการผู้ใช้" }]);

  const { user, hasPermission, hasRole } = useAuthPermissions();
  const canCreateUser = hasPermission("users.create");
  const canUpdateStatus = hasPermission("users.updateStatus");
  const canUpdateUser = hasPermission("users.update");
  const canDeleteUser = hasPermission("users.delete");
  const canManageRoles = hasRole("admin");
  const columns = useMemo(
    () => createColumns(canUpdateStatus, canUpdateUser, canDeleteUser, user?.id),
    [canUpdateStatus, canUpdateUser, canDeleteUser, user?.id],
  );

  // มีสิทธิ์เดียว = ปุ่มลอยทำทันที, ทั้งสอง = เมนู, ไม่มีเลย = ไม่แสดงปุ่ม
  const fabActions: FloatingAction[] = [
    ...(canCreateUser ? [{ label: "เพิ่ม user", icon: UserPlus, href: routes.dashboards.user.create }] : []),
    ...(canManageRoles
      ? [{ label: "จัดการ Role และ Permission", icon: ShieldCheck, href: routes.dashboards.user.roles }]
      : []),
  ];

  const {
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    clearFilters,
    activeFilterCount,
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
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
        <p className="text-sm text-gray-600 tracking-wide">
          รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า
        </p>
      </div>

      <FloatingActionButton menuLabel="เพิ่ม user / จัดการ Role และ Permission" actions={fabActions} />

      {isPending ? (
        <UserListSkeleton />
      ) : (
        <>
          <UserFilterBar
            search={search}
            setSearch={setSearch}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sorting={sorting}
            setSorting={setSorting}
            activeFilterCount={activeFilterCount}
            onClear={clearFilters}
          />

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
              renderMobileCard={(row) => (
                <UserCard
                  user={row}
                  canUpdateStatus={canUpdateStatus}
                  canUpdateUser={canUpdateUser}
                  canDeleteUser={canDeleteUser}
                  currentUserId={user?.id}
                />
              )}
              mobileCardGridClassName={CARD_GRID_CLASS}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {debouncedSearch
                ? "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา"
                : activeFilterCount > 0
                  ? "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไขที่เลือก"
                  : "ยังไม่มีผู้ใช้ในระบบ"}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<UserListSkeleton />}>
      <UsersPageContent />
    </Suspense>
  );
}
