"use client";

import { isAxiosError } from "axios";
import { Fragment } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUpdateRole } from "@/lib/user/management/mutations/useUpdateRole";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import type { Permission, RoleDetail } from "@/lib/user/management/types";
import { getGroupLabel } from "../_data/group-labels";
import { DeleteRoleDialog } from "./delete-role-dialog";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

function PermissionCell({ role, permission }: { role: RoleDetail; permission: Permission }) {
  const updateRoleMutation = useUpdateRole(role.id);

  const toggle = (checked: boolean) => {
    const next = checked
      ? [...role.permissions, permission.name]
      : role.permissions.filter((name) => name !== permission.name);

    toast.promise(updateRoleMutation.mutateAsync({ name: role.name, permissions: next }), {
      loading: "กำลังบันทึกการแก้ไข...",
      success: "บันทึกการแก้ไขสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <Checkbox
      checked={role.permissions.includes(permission.name)}
      disabled={updateRoleMutation.isPending}
      onCheckedChange={(checked) => toggle(checked === true)}
      aria-label={`${permission.label} - ${role.name}`}
      className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
    />
  );
}

export function RoleTab() {
  const { data: roles, isPending: rolesPending, isError: rolesError } = useRoles();
  const { data: permissions, isPending: permissionsPending, isError: permissionsError } = usePermissions();

  const groups = (permissions ?? []).reduce<Record<string, Permission[]>>((acc, permission) => {
    const group = permission.name.split(".")[0];
    (acc[group] ??= []).push(permission);
    return acc;
  }, {});

  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  const isPending = rolesPending || permissionsPending;
  const isError = rolesError || permissionsError;

  return (
    <div className="flex flex-col gap-4">
      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดข้อมูล role ได้ กรุณาลองใหม่อีกครั้ง
        </p>
      ) : !roles || roles.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ยังไม่มี role ในระบบ
        </p>
      ) : groupNames.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ยังไม่มี permission ในระบบ
        </p>
      ) : (
        <Card className="shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role.id} className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{role.name}</span>
                        <DeleteRoleDialog role={role} />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupNames.map((group) => {
                  const items = [...groups[group]].sort((a, b) => a.name.localeCompare(b.name));
                  return (
                    <Fragment key={group}>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell
                          colSpan={roles.length + 1}
                          className="text-xs font-semibold text-muted-foreground"
                        >
                          {getGroupLabel(group)}
                        </TableCell>
                      </TableRow>
                      {items.map((permission) => (
                        <TableRow key={permission.name}>
                          <TableCell>{permission.label}</TableCell>
                          {roles.map((role) => (
                            <TableCell key={role.id} className="text-center">
                              <PermissionCell role={role} permission={permission} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
