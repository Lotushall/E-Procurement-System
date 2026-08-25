"use client";

import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InputField } from "@/components/input-field";
import { PermissionPicker } from "@/components/permission-picker";
import { RoleSelect } from "@/components/role-select";
import { DepartmentSelect } from "@/components/department-select";
import { PositionSelect } from "@/components/position-select";
import type { Permission, RoleDetail } from "@/lib/user/management/types";
import type { Department, Position } from "@/lib/internal-profiles/types";
import type { CreateUserValues } from "../_schemas/schema";

const PREFIX_OPTIONS = ["นาย", "นาง"] as const;

export function CreateInternalUserFields({
  register,
  control,
  errors,
  setValue,
  roles,
  permissions,
  departments,
  positions,
}: {
  register: UseFormRegister<CreateUserValues>;
  control: Control<CreateUserValues>;
  errors: FieldErrors<CreateUserValues>;
  setValue: UseFormSetValue<CreateUserValues>;
  roles: RoleDetail[];
  permissions: Permission[];
  departments: Department[];
  positions: Position[];
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

      <div className="grid gap-4 md:grid-cols-3">
        <Controller
          control={control}
          name="prefix"
          render={({ field: { value, onChange } }) => (
            <InputField label="คำนำหน้า" error={errors.prefix?.message}>
              <Select
                items={PREFIX_OPTIONS.map((p) => ({ value: p, label: p }))}
                value={value}
                onValueChange={(next) => {
                  if (next !== null) onChange(next);
                }}
              >
                <SelectTrigger className="w-full h-11! rounded-sm" aria-invalid={!!errors.prefix}>
                  <SelectValue placeholder="เลือกคำนำหน้า" />
                </SelectTrigger>
                <SelectContent side="bottom" alignItemWithTrigger={false}>
                  <SelectGroup>
                    {PREFIX_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
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
          <Input {...register("employeeNo")} aria-invalid={!!errors.employeeNo} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="เบอร์โทร" error={errors.phone?.message}>
          <Input {...register("phone")} aria-invalid={!!errors.phone} className="h-11 rounded-sm" />
        </InputField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Controller
          control={control}
          name="departmentId"
          render={({ field: { value, onChange } }) => (
            <InputField label="แผนก" error={errors.departmentId?.message}>
              <DepartmentSelect
                departments={departments}
                value={value ?? ""}
                ariaInvalid={!!errors.departmentId}
                onValueChange={onChange}
                className="h-11!"
              />
            </InputField>
          )}
        />

        <Controller
          control={control}
          name="positionId"
          render={({ field: { value, onChange } }) => (
            <InputField label="ตำแหน่ง" error={errors.positionId?.message}>
              <PositionSelect
                positions={positions}
                value={value ?? ""}
                ariaInvalid={!!errors.positionId}
                onValueChange={onChange}
                className="h-11!"
              />
            </InputField>
          )}
        />
      </div>

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
