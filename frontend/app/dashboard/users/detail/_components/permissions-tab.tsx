import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupLabel } from "@/app/dashboard/users/roles-permissions/_data/group-labels";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import type { Permission, UserDetail } from "@/lib/user/management/types";

export function PermissionsTab({ user }: { user: UserDetail }) {
  const { data: roles } = useRoles();
  const { data: allPermissions } = usePermissions();
  const matchedRole = roles?.find((role) => role.name === user.role);
  const rolePermissions = new Set(matchedRole?.permissions ?? []);
  const grantedNames = user.permissions ?? [];

  const granted: Permission[] = grantedNames.map((name) => {
    const meta = allPermissions?.find((permission) => permission.name === name);
    return meta ?? { name, label: name, group: name.split(".")[0] };
  });

  const groups = granted.reduce<Record<string, Permission[]>>((acc, permission) => {
    (acc[permission.group] ??= []).push(permission);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Role:</span>
        {!user.role ? (
          <span className="text-sm text-muted-foreground">ยังไม่ได้กำหนด role</span>
        ) : (
          <Badge className="bg-red-700 text-white capitalize">{user.role}</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>สิทธิ์การใช้งาน (Permissions)</CardTitle>
        </CardHeader>
        <CardContent>
          {grantedNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">ผู้ใช้นี้ยังไม่มีสิทธิ์การใช้งาน</p>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(groups).map(([group, items]) => (
                <div key={group} className="flex flex-col gap-2">
                  <p className="text-sm font-bold">{getGroupLabel(group)}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {items.map((permission) => (
                      <div
                        key={permission.name}
                        className="flex items-center gap-2.5 rounded-md border p-3"
                      >
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-700/15 text-green-800">
                          <Check className="size-3.5" />
                        </div>
                        <div className="flex flex-1 flex-col overflow-hidden">
                          <span className="truncate text-sm font-semibold">{permission.label}</span>
                          <span className="truncate text-xs text-muted-foreground">{permission.name}</span>
                        </div>
                        {rolePermissions.has(permission.name) ? (
                          <Badge variant="outline" className="shrink-0">Role</Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">กำหนดเอง (Direct)</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
