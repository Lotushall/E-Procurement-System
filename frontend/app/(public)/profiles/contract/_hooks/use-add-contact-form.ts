import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddContactSchema, AddContactValues } from "../_schemas/schema";
import { useSaveVendorContact } from "@/lib/vendor/profile/mutations/useSaveVendorContact";
import { handleServerError } from "@/lib/form/server-errors";

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
      error: (error) => handleServerError(error, form, "บันทึกข้อมูลผู้ติดต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateVendorContactMutation.isPending,
  };
}
