"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { DeleteRoleDialog } from "./delete-role-dialog";
import { RoleFormDialog } from "./role-form-dialog";

export function RoleTab() {
  const { data: roles, isPending, isError } = useRoles();

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
            <Card key={role.id} className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{role.name}</span>
                  <div className="flex shrink-0 gap-1.5">
                    <RoleFormDialog role={role} />
                    <DeleteRoleDialog role={role} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge variant="secondary">{role.permissions?.length ?? 0} permissions</Badge>
                <Badge variant="outline">{role.userCount} คน</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
