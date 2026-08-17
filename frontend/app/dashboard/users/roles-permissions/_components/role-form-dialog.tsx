"use client";

import { useState } from "react";
import { Lock, Pencil, Plus } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import type { Permission, RoleDetail } from "@/lib/user/management/types";
import { getGroupLabel } from "../_data/group-labels";
import { useRoleForm } from "../_hooks/use-role-form";

export function RoleFormDialog({ role }: { role?: RoleDetail }) {
  const [open, setOpen] = useState(false);
  const { data: permissions, isPending: permissionsPending, isError: permissionsError } = usePermissions();
  const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } =
    useRoleForm(() => setOpen(false), role);

  const groups = (permissions ?? []).reduce<Record<string, Permission[]>>((acc, permission) => {
    const group = permission.name.split(".")[0];
    (acc[group] ??= []).push(permission);
    return acc;
  }, {});

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          role ? (
            <Button variant="outline" aria-label="แก้ไข role" className="size-8 px-1.5 pt-px rounded-md bg-white" />
          ) : (
            <Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10" />
          )
        }
      >
        {role ? <Pencil className="w-4 h-4 text-gray-500" /> : (<><Plus /><p>สร้าง role</p></>)}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{role ? "แก้ไข role" : "สร้าง role"}</DialogTitle>
          <DialogDescription>
            {role ? `แก้ไขชื่อและ permission ของ role "${role.name}"` : "ตั้งชื่อและเลือก permission สำหรับ role ใหม่"}
          </DialogDescription>
        </DialogHeader>

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
            <InputField label="ชื่อ role" error={errors.name?.message}>
              <Input
                {...register("name")}
                aria-invalid={!!errors.name}
                className="h-11 rounded-sm"
                placeholder="เช่น procurement_officer"
              />
            </InputField>

            <Controller
              control={control}
              name="permissions"
              render={({ field: { value, onChange } }) => (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="size-4 text-red-700" />
                      <span className="text-sm font-semibold tracking-wider">Permission</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => onChange((permissions ?? []).map((permission) => permission.name))}
                        className="cursor-pointer font-medium text-red-700 hover:underline"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange([])}
                        className="cursor-pointer text-muted-foreground hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {errors.permissions && (
                    <p className="text-xs text-destructive">{errors.permissions.message}</p>
                  )}

                  <div className="flex flex-col gap-4">
                    {Object.entries(groups).map(([group, items]) => (
                      <div key={group} className="flex flex-col gap-2">
                        <p className="text-sm">
                          <span className="font-bold">{group.toUpperCase()}</span>{" "}
                          <span className="text-muted-foreground">{getGroupLabel(group)}</span>
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {items.map((permission) => (
                            <label
                              key={permission.name}
                              htmlFor={permission.name}
                              className="flex items-center gap-2.5 rounded-md border p-3 cursor-pointer hover:border-red-700/40"
                            >
                              <Checkbox
                                id={permission.name}
                                checked={value.includes(permission.name)}
                                onCheckedChange={(checked) =>
                                  onChange(
                                    checked
                                      ? [...value, permission.name]
                                      : value.filter((name) => name !== permission.name),
                                  )
                                }
                                className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
                              />
                              <div className="flex flex-col overflow-hidden">
                                <span className="truncate text-sm font-semibold">{permission.label}</span>
                                <span className="truncate text-xs text-muted-foreground">{permission.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            />

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                {role ? "บันทึกการแก้ไข" : "สร้าง role"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
