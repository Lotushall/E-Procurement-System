import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateUser } from "@/lib/user/management/mutations/useCreateUser";
import type { CreateUserPayload } from "@/lib/user/management/types";
import { handleServerError } from "@/lib/form/server-errors";
import { CreateUserSchema, type CreateUserValues } from "../_schemas/schema";

export function useCreateUserForm(onSubmitted: () => void) {
  const createUserMutation = useCreateUser();

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      internalProfileId: "",
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
      internalProfileId: Number(values.internalProfileId),
    };

    toast.promise(createUserMutation.mutateAsync(payload), {
      loading: "กำลังสร้าง user...",
      success: () => {
        form.reset();
        onSubmitted();
        return "สร้าง user สำเร็จ";
      },
      error: (error) => handleServerError(error, form, "สร้าง user ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createUserMutation.isPending,
  };
}
