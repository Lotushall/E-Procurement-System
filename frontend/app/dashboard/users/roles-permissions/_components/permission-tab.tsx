"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import type { Permission } from "@/lib/user/management/types";
import { getGroupLabel } from "../_data/group-labels";
import { DeletePermissionDialog } from "./delete-permission-dialog";
import { PermissionFormDialog } from "./permission-form-dialog";

export function PermissionTab() {
  const { data: permissions, isPending, isError } = usePermissions();

  const groups = (permissions ?? []).reduce<Record<string, Permission[]>>((acc, permission) => {
    const group = permission.name.split(".")[0];
    (acc[group] ??= []).push(permission);
    return acc;
  }, {});

  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <PermissionFormDialog />
      </div>

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดข้อมูล permission ได้ กรุณาลองใหม่อีกครั้ง
        </p>
      ) : groupNames.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ยังไม่มี permission ในระบบ
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupNames.map((group) => {
            const items = [...groups[group]].sort((a, b) => a.name.localeCompare(b.name));
            return (
              <Card key={group} className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{getGroupLabel(group)}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {items.length} permissions
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {items.map((permission) => (
                    <div
                      key={permission.name}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-bold">{permission.label}</span>
                        <span className="truncate text-xs text-muted-foreground">{permission.name}</span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <PermissionFormDialog permission={permission} />
                        <DeletePermissionDialog permission={permission} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
