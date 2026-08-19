import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateUser } from "@/lib/user/management/mutations/useCreateUser";
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
      role: "",
      permissions: [],
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(createUserMutation.mutateAsync(values), {
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
