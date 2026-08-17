"use client";

import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
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

function RoleCard({
  role,
  groupNames,
  groups,
}: {
  role: RoleDetail;
  groupNames: string[];
  groups: Record<string, Permission[]>;
}) {
  const updateRoleMutation = useUpdateRole(role.id);

  const togglePermission = (name: string, checked: boolean) => {
    const permissions = checked
      ? [...role.permissions, name]
      : role.permissions.filter((permission) => permission !== name);

    toast.promise(updateRoleMutation.mutateAsync({ name: role.name, permissions }), {
      loading: "กำลังบันทึกการแก้ไข...",
      success: "บันทึกการแก้ไขสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{role.name}</span>
          <DeleteRoleDialog role={role} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{role.permissions?.length ?? 0} permissions</Badge>
          <Badge variant="outline">{role.userCount} คน</Badge>
        </div>

        <div className="flex flex-col gap-3">
          {groupNames.map((group) => {
            const items = [...groups[group]].sort((a, b) => a.name.localeCompare(b.name));
            return (
              <div key={group} className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-muted-foreground">{getGroupLabel(group)}</p>
                {items.map((permission) => (
                  <Field key={permission.name} orientation="horizontal" className="w-fit">
                    <Checkbox
                      id={`${role.id}-${permission.name}`}
                      checked={role.permissions.includes(permission.name)}
                      disabled={updateRoleMutation.isPending}
                      onCheckedChange={(checked) => togglePermission(permission.name, checked === true)}
                      className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
                    />
                    <FieldLabel htmlFor={`${role.id}-${permission.name}`} className="font-light tracking-wide text-sm cursor-pointer">
                      {permission.label}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
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
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} groupNames={groupNames} groups={groups} />
          ))}
        </div>
      )}
    </div>
  );
}
