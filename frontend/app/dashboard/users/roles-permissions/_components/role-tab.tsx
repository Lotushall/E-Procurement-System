"use client";

import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function RoleMatrixRow({ role, permissions }: { role: RoleDetail; permissions: Permission[] }) {
  const updateRoleMutation = useUpdateRole(role.id);

  const togglePermission = (name: string, checked: boolean) => {
    const next = checked
      ? [...role.permissions, name]
      : role.permissions.filter((permission) => permission !== name);

    toast.promise(updateRoleMutation.mutateAsync({ name: role.name, permissions: next }), {
      loading: "กำลังบันทึกการแก้ไข...",
      success: "บันทึกการแก้ไขสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-1.5">
          <span>{role.name}</span>
          <DeleteRoleDialog role={role} />
        </div>
      </TableCell>
      {permissions.map((permission) => (
        <TableCell key={permission.name} className="text-center">
          <Checkbox
            checked={role.permissions.includes(permission.name)}
            disabled={updateRoleMutation.isPending}
            onCheckedChange={(checked) => togglePermission(permission.name, checked === true)}
            aria-label={`${permission.label} - ${role.name}`}
            className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
          />
        </TableCell>
      ))}
    </TableRow>
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
        groupNames.map((group) => {
          const items = [...groups[group]].sort((a, b) => a.name.localeCompare(b.name));
          return (
            <Card key={group} className="shadow-md">
              <CardHeader>
                <CardTitle>{getGroupLabel(group)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      {items.map((permission) => (
                        <TableHead key={permission.name} className="text-center">
                          {permission.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <RoleMatrixRow key={role.id} role={role} permissions={items} />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
