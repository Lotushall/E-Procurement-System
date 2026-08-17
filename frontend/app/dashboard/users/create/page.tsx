"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import { RequirePermission } from "@/lib/auth/guards/RequirePermission";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import { routes } from "@/lib/routes";
import { useCreateUserForm } from "../_hooks/use-create-user-form";
import { PermissionPicker } from "@/components/permission-picker";

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
};

export default function CreateUserPage() {
  return (
    <RequirePermission permission="users.create">
      <CreateUserPageContent />
    </RequirePermission>
  );
}

function CreateUserPageContent() {
  const router = useRouter();
  const { data: roles } = useRoles();
  const { data: permissions, isPending: permissionsPending, isError: permissionsError } = usePermissions();
  const { register, control, setValue, onSubmit, isSubmitting, formState: { errors } } =
    useCreateUserForm(() => router.push(routes.dashboards.user.index));

  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    { label: "เพิ่ม user" },
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">เพิ่ม user</h1>
        <p className="text-sm text-gray-600 tracking-wide">
          สร้างบัญชี internal user ใหม่สำหรับพนักงานภายใน
        </p>
      </div>

      <Card className="shadow-md">
        <CardContent className="pt-6">
          {permissionsPending ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : permissionsError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              ไม่สามารถโหลดรายการ permission ได้ กรุณาลองใหม่อีกครั้ง
            </p>
          ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Username" error={errors.username?.message}>
                <Input {...register("username")} aria-invalid={!!errors.username} className="h-11 rounded-sm" />
              </InputField>
              <InputField label="อีเมล" error={errors.email?.message}>
                <Input {...register("email")} type="email" aria-invalid={!!errors.email} className="h-11 rounded-sm" />
              </InputField>
            </div>

            <InputField label="รหัสผ่าน" error={errors.password?.message}>
              <Input {...register("password")} type="password" aria-invalid={!!errors.password} className="h-11 rounded-sm" />
            </InputField>

            <div className="grid gap-4 md:grid-cols-3">
              <Controller
                control={control}
                name="prefix"
                render={({ field: { value, onChange, ...field } }) => (
                  <InputField label="คำนำหน้า">
                    <Select value={value || "นาย"} onValueChange={onChange} {...field}>
                      <SelectTrigger className="w-full h-11! rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="bottom" alignItemWithTrigger={false}>
                        <SelectGroup>
                          <SelectItem value="นาย">นาย</SelectItem>
                          <SelectItem value="นาง">นาง</SelectItem>
                          <SelectItem value="นางสาว">นางสาว</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </InputField>
                )}
              />

              <InputField label="ชื่อ" error={errors.firstname?.message}>
                <Input {...register("firstname")} aria-invalid={!!errors.firstname} className="h-11 rounded-sm" />
              </InputField>

              <InputField label="นามสกุล" error={errors.lastname?.message}>
                <Input {...register("lastname")} aria-invalid={!!errors.lastname} className="h-11 rounded-sm" />
              </InputField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="รหัสพนักงาน" error={errors.employeeNo?.message}>
                <Input {...register("employeeNo")} className="h-11 rounded-sm" />
              </InputField>
              <InputField label="เบอร์โทร" error={errors.phone?.message}>
                <Input {...register("phone")} inputMode="numeric" className="h-11 rounded-sm" />
              </InputField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="แผนก" error={errors.department?.message}>
                <Input {...register("department")} className="h-11 rounded-sm" />
              </InputField>
              <InputField label="ตำแหน่ง" error={errors.position?.message}>
                <Input {...register("position")} className="h-11 rounded-sm" />
              </InputField>
            </div>

            <Controller
              control={control}
              name="role"
              render={({ field: { value, onChange, ...field } }) => (
                <InputField label="บทบาท (Role)" error={errors.role?.message}>
                  <Select
                    items={(roles ?? []).map((r) => ({ value: r.name, label: ROLE_LABELS[r.name] ?? r.name }))}
                    value={value}
                    onValueChange={(next) => {
                      onChange(next);
                      setValue("permissions", (roles ?? []).find((r) => r.name === next)?.permissions ?? []);
                    }}
                    {...field}
                  >
                    <SelectTrigger className="w-full h-11! rounded-sm" aria-invalid={!!errors.role}>
                      <SelectValue placeholder="เลือก role" />
                    </SelectTrigger>
                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                      <SelectGroup>
                        {(roles ?? []).map((r) => (
                          <SelectItem key={r.name} value={r.name}>
                            {ROLE_LABELS[r.name] ?? r.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </InputField>
              )}
            />

            <Controller
              control={control}
              name="permissions"
              render={({ field: { value, onChange } }) => (
                <div className="flex flex-col gap-4">
                  {errors.permissions && (
                    <p className="text-xs text-destructive">{errors.permissions.message}</p>
                  )}
                  <PermissionPicker permissions={permissions ?? []} value={value} onChange={onChange} />
                </div>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                render={<Link href={routes.dashboards.user.index} />}
                nativeButton={false}
                className="h-11 md:w-20"
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                บันทึก
              </Button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
