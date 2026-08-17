import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { MockUserDetail } from "../_data/mock-user-detail";

export function PermissionsTab({ user }: { user: MockUserDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Role</CardTitle>
        </CardHeader>
        <CardContent>
          {user.roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">ผู้ใช้นี้ยังไม่ได้กำหนด role</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <Badge key={role} className="bg-red-700 text-white capitalize">
                  {role}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>สิทธิ์การใช้งาน (Permissions)</CardTitle>
        </CardHeader>
        <CardContent>
          {user.permissions.length === 0 ? (
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
                {user.permissions.map((permission) => (
                  <TableRow key={permission.name}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{permission.label}</span>
                        <span className="text-xs text-muted-foreground">{permission.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {permission.source === "role" ? (
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
