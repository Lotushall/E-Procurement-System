"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { useCreateUserForm } from "../_hooks/use-create-user-form";

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
};

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const { data: roles } = useRoles();
  const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } =
    useCreateUserForm(() => setOpen(false));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10" />}>
        <Plus />
        <p>เพิ่ม user</p>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>เพิ่ม user</DialogTitle>
          <DialogDescription>สร้างบัญชี internal user ใหม่สำหรับพนักงานภายใน</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid md:grid-cols-2 gap-4">
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

          <div className="grid md:grid-cols-3 gap-4">
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

          <div className="grid md:grid-cols-2 gap-4">
            <InputField label="รหัสพนักงาน" error={errors.employeeNo?.message}>
              <Input {...register("employeeNo")} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="เบอร์โทร" error={errors.phone?.message}>
              <Input {...register("phone")} inputMode="numeric" className="h-11 rounded-sm" />
            </InputField>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
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
                  onValueChange={onChange}
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

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
