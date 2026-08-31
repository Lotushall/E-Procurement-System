"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { RequirePermission } from "@/lib/auth/guards/RequirePermission";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import { useAvailableInternalProfiles } from "@/lib/internal-profiles/queries/useAvailableInternalProfiles";
import { routes } from "@/lib/routes";
import { useCreateUserForm } from "../_hooks/use-create-user-form";
import { CreateInternalUserFields } from "../_components/create-internal-user-fields";

function CreateUserPageContent() {
  const router = useRouter();
  const { data: roles } = useRoles();
  const { data: permissions, isPending: permissionsPending, isError: permissionsError } = usePermissions();
  const {
    data: internalProfiles,
    isPending: internalProfilesPending,
    isError: internalProfilesError,
  } = useAvailableInternalProfiles();
  const { register, control, setValue, onSubmit, isSubmitting, formState: { errors } } = useCreateUserForm(() => router.push(routes.dashboards.user.index));

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
          {(permissionsPending || internalProfilesPending) ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : (permissionsError || internalProfilesError) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              ไม่สามารถโหลดข้อมูลที่จำเป็นสำหรับฟอร์มได้ กรุณาลองใหม่อีกครั้ง
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
              <CreateInternalUserFields
                register={register}
                control={control}
                errors={errors}
                setValue={setValue}
                roles={roles ?? []}
                permissions={permissions ?? []}
                internalProfiles={internalProfiles ?? []}
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

export default function CreateUserPage() {
  return (
    <RequirePermission permission="users.create">
      <CreateUserPageContent />
    </RequirePermission>
  );
}
