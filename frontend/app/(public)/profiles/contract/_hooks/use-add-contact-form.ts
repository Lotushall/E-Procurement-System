import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddContactSchema, AddContactValues } from "../_schemas/schema";
import { useSaveVendorContact } from "@/lib/vendor/mutations";

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

  return message ?? "บันทึกข้อมูลผู้ติดต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useAddContactForm(
  onSubmitted: () => void,
  initialValues?: AddContactValues,
) {
  const updateVendorContactMutation = useSaveVendorContact();

  const form = useForm<AddContactValues>({
    resolver: zodResolver(AddContactSchema),
    defaultValues: initialValues ?? {
      contactName: "",
      contactPosition: "",
      contactPhone: "",
      contactEmail: "",
      lineId: "",
      otherContact: "",
      isMainContact: false,
    },
    values: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(updateVendorContactMutation.mutateAsync(values), {
      loading: "กำลังบันทึกผู้ติดต่อ...",
      success: () => {
        form.reset();
        onSubmitted();
        return "บันทึกผู้ติดต่อสำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateVendorContactMutation.isPending,
  };
}
