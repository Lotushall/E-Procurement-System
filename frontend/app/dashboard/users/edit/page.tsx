"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import { PermissionPicker } from "@/components/permission-picker";
import { RequirePermission } from "@/lib/auth/guards/RequirePermission";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import { useUserDetail } from "@/lib/user/management/queries/useUserDetail";
import type { UserDetail } from "@/lib/user/management/types";
import { routes } from "@/lib/routes";
import { useUpdateAccountForm } from "../_hooks/use-update-account-form";
import { useUpdateInternalUserForm } from "../_hooks/use-update-internal-user-form";

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
};

export default function EditUserPage() {
  return (
    <RequirePermission permission="users.update">
      <Suspense fallback={null}>
        <EditUserPageContent />
      </Suspense>
    </RequirePermission>
  );
}

function EditUserPageContent() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("id"));
  const isValidId = Number.isFinite(userId) && userId > 0;

  const { data: user, isPending, isError } = useUserDetail(userId);
  const notFound = !isValidId || (isError && !user) || (!isPending && !user);

  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    isValidId && isPending ? { loading: true } : { label: user ? `แก้ไข ${user.name}` : "ไม่พบข้อมูล" },
  ]);

  if (isValidId && isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลผู้ใช้รายนี้
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">แก้ไข user</h1>
        <p className="text-sm text-gray-600 tracking-wide">
          แก้ไขข้อมูลบัญชี{user.userType === "internal" ? "และโปรไฟล์/role" : ""} ของ {user.name}
        </p>
      </div>

      <Card className="shadow-md">
        <CardContent className="pt-6">
          {user.userType === "internal" ? (
            <EditInternalUserForm user={user} />
          ) : (
            <EditAccountForm user={user} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditAccountForm({ user }: { user: UserDetail }) {
  const router = useRouter();
  const { register, onSubmit, isSubmitting, formState: { errors } } =
    useUpdateAccountForm(user.id, () => router.push(routes.dashboards.user.detail(user.id)), {
      username: user.username,
      email: user.email,
      password: "",
    });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <InputField label="Username" error={errors.username?.message}>
          <Input {...register("username")} aria-invalid={!!errors.username} className="h-11 rounded-sm" />
        </InputField>
        <InputField label="อีเมล" error={errors.email?.message}>
          <Input {...register("email")} type="email" aria-invalid={!!errors.email} className="h-11 rounded-sm" />
        </InputField>
      </div>

      <InputField label="รหัสผ่านใหม่" error={errors.password?.message}>
        <Input
          {...register("password")}
          type="password"
          placeholder="เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          className="h-11 rounded-sm"
        />
      </InputField>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          render={<Link href={routes.dashboards.user.detail(user.id)} />}
          nativeButton={false}
          className="h-11 md:w-20"
        >
          ยกเลิก
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
          บันทึกการแก้ไข
        </Button>
      </div>
    </form>
  );
}

function EditInternalUserForm({ user }: { user: UserDetail }) {
  const router = useRouter();
  const { data: roles } = useRoles();
  const { data: permissions } = usePermissions();
  const { register, control, setValue, onSubmit, isSubmitting, formState: { errors } } =
    useUpdateInternalUserForm(user.id, () => router.push(routes.dashboards.user.detail(user.id)), {
      username: user.username,
      email: user.email,
      password: "",
      prefix: user.internalProfile?.prefix ?? "นาย",
      firstname: user.internalProfile?.firstname ?? "",
      lastname: user.internalProfile?.lastname ?? "",
      employeeNo: user.internalProfile?.employeeNo ?? "",
      department: user.internalProfile?.department ?? "",
      position: user.internalProfile?.position ?? "",
      phone: user.internalProfile?.phone ?? "",
      role: user.role ?? "",
      permissions: user.permissions ?? [],
    });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <InputField label="Username" error={errors.username?.message}>
          <Input {...register("username")} aria-invalid={!!errors.username} className="h-11 rounded-sm" />
        </InputField>
        <InputField label="อีเมล" error={errors.email?.message}>
          <Input {...register("email")} type="email" aria-invalid={!!errors.email} className="h-11 rounded-sm" />
        </InputField>
      </div>

      <InputField label="รหัสผ่านใหม่" error={errors.password?.message}>
        <Input
          {...register("password")}
          type="password"
          placeholder="เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          className="h-11 rounded-sm"
        />
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
          render={<Link href={routes.dashboards.user.detail(user.id)} />}
          nativeButton={false}
          className="h-11 md:w-20"
        >
          ยกเลิก
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
          บันทึกการแก้ไข
        </Button>
      </div>
    </form>
  );
}
