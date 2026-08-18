import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import type { UserDetail } from "@/lib/user/management/types";

export function PermissionsTab({ user }: { user: UserDetail }) {
  const { data: roles } = useRoles();
  const matchedRole = roles?.find((role) => role.name === user.role);
  const rolePermissions = new Set(matchedRole?.permissions ?? []);
  const permissions = user.permissions ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Role</CardTitle>
        </CardHeader>
        <CardContent>
          {!user.role ? (
            <p className="text-sm text-muted-foreground">ผู้ใช้นี้ยังไม่ได้กำหนด role</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-red-700 text-white capitalize">{user.role}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>สิทธิ์การใช้งาน (Permissions)</CardTitle>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">ผู้ใช้นี้ยังไม่มีสิทธิ์การใช้งาน</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>สิทธิ์การใช้งาน</TableHead>
                  <TableHead>ที่มา</TableHead>
                  <TableHead className="text-right">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((name) => (
                  <TableRow key={name}>
                    <TableCell>
                      <span className="text-sm font-medium">{name}</span>
                    </TableCell>
                    <TableCell>
                      {rolePermissions.has(name) ? (
                        <Badge variant="outline">Role</Badge>
                      ) : (
                        <Badge variant="secondary">กำหนดเอง (Direct)</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-700/15 text-green-800">เปิดใช้งาน</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
