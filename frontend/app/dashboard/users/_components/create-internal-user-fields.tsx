"use client";

import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import { PermissionPicker } from "@/components/permission-picker";
import { RoleSelect } from "@/components/role-select";
import { InternalProfileSelect } from "@/components/internal-profile-select";
import type { Permission, RoleDetail } from "@/lib/user/management/types";
import type { AvailableInternalProfile } from "@/lib/internal-profiles/types";
import type { CreateUserValues } from "../_schemas/schema";

export function CreateInternalUserFields({
  register,
  control,
  errors,
  setValue,
  roles,
  permissions,
  internalProfiles,
}: {
  register: UseFormRegister<CreateUserValues>;
  control: Control<CreateUserValues>;
  errors: FieldErrors<CreateUserValues>;
  setValue: UseFormSetValue<CreateUserValues>;
  roles: RoleDetail[];
  permissions: Permission[];
  internalProfiles: AvailableInternalProfile[];
}) {
  return (
    <>
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

      <Controller
        control={control}
        name="internalProfileId"
        render={({ field: { value, onChange } }) => (
          <InputField label="พนักงาน" error={errors.internalProfileId?.message}>
            <InternalProfileSelect
              profiles={internalProfiles}
              value={value}
              ariaInvalid={!!errors.internalProfileId}
              onValueChange={onChange}
              className="h-11!"
            />
          </InputField>
        )}
      />

      <Controller
        control={control}
        name="role"
        render={({ field: { value, onChange } }) => (
          <InputField label="บทบาท (Role)" error={errors.role?.message}>
            <RoleSelect
              roles={roles}
              value={value}
              ariaInvalid={!!errors.role}
              onValueChange={(next) => {
                onChange(next);
                setValue("permissions", roles.find((r) => r.name === next)?.permissions ?? []);
              }}
            />
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
            <PermissionPicker permissions={permissions} value={value} onChange={onChange} />
          </div>
        )}
      />
    </>
  );
}
