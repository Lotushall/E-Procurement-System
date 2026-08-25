import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateUser } from "@/lib/user/management/mutations/useCreateUser";
import type { CreateUserPayload } from "@/lib/user/management/types";
import { CreateUserSchema, type CreateUserValues } from "../_schemas/schema";

function getErrorMessage(error: unknown): string {
  const fieldErrors =
    isAxiosError(error) && error.response?.status === 422
      ? (error.response.data as { errors?: Record<string, string[]> }).errors
      : undefined;

  const message = fieldErrors
    ? Object.values(fieldErrors)[0]?.[0]
    : isAxiosError(error)
      ? (error.response?.data as { message?: string } | undefined)?.message
      : undefined;

  return message ?? "สร้าง user ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useCreateUserForm(onSubmitted: () => void) {
  const createUserMutation = useCreateUser();

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      prefix: "",
      firstname: "",
      lastname: "",
      employeeNo: "",
      departmentId: "",
      positionId: "",
      phone: "",
      role: "",
      permissions: [],
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreateUserPayload = {
      username: values.username,
      email: values.email,
      password: values.password,
      role: values.role,
      permissions: values.permissions,
      prefix: values.prefix || undefined,
      firstname: values.firstname,
      lastname: values.lastname,
      employeeNo: values.employeeNo || undefined,
      departmentId: values.departmentId ? Number(values.departmentId) : undefined,
      positionId: values.positionId ? Number(values.positionId) : undefined,
      phone: values.phone || undefined,
    };

    toast.promise(createUserMutation.mutateAsync(payload), {
      loading: "กำลังสร้าง user...",
      success: () => {
        form.reset();
        onSubmitted();
        return "สร้าง user สำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createUserMutation.isPending,
  };
}
