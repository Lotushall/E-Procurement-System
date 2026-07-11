import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useRegister, useResendVerificationEmail } from "@/lib/auth/mutations";
import type { RegisterVendorPayload } from "@/lib/auth/types";
import { RegisterSchema, RegisterValues } from "../_schemas/schema";

const RESEND_COOLDOWN_SECONDS = 60;

function toRegisterPayload(values: RegisterValues): RegisterVendorPayload {
  return {
    vendorType: values.vendorType,
    ...(values.vendorType === "company"
      ? { companyName: values.companyName, taxId: values.taxId }
      : { fullName: values.fullName, idCard: values.idCard }),
    phone: values.phone,
    username: values.username,
    email: values.email,
    password: values.password,
    confirmPassword: values.confirmPassword,
    password_confirmation: values.confirmPassword,
    terms: values.terms,
  };
}

export function useRegisterForm() {
  const registerMutation = useRegister();
  const resendMutation = useResendVerificationEmail();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(
      () => setResendCooldown((seconds) => seconds - 1),
      1000,
    );
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      vendorType: "company",
      companyName: "",
      taxId: "",
      fullName: "",
      idCard: "",
      phone: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const vendorType = useWatch({ control: form.control, name: "vendorType" });
  const termsAccepted = useWatch({ control: form.control, name: "terms" });

  const onSubmit = form.handleSubmit((values) => {
    registerMutation.mutate(toRegisterPayload(values), {
      onSuccess: () => {
        setRegisteredEmail(values.email);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 422) {
          const fieldErrors = (
            error.response.data as { errors?: Record<string, string[]> }
          ).errors;
          if (fieldErrors) {
            Object.entries(fieldErrors).forEach(([field, messages]) => {
              form.setError(field as keyof RegisterValues, {
                type: "server",
                message: messages[0],
              });
            });
            return;
          }
        }

        const message = isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)?.message
          : undefined;
        toast.error(message ?? "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");

        console.log(message);
      },
    });
  });

  const onResend = () => {
    if (!registeredEmail || resendCooldown > 0) return;

    resendMutation.mutate(registeredEmail, {
      onSuccess: () => {
        toast.success("ส่งลิงก์ยืนยันอีกครั้งแล้ว กรุณาตรวจสอบกล่องจดหมาย");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      },
      onError: () => {
        toast.error("ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      },
    });
  };

  return {
    ...form,
    vendorType,
    termsAccepted,
    onSubmit,
    isSubmitting: registerMutation.isPending,
    registeredEmail,
    onResend,
    isResending: resendMutation.isPending,
    resendCooldown,
  };
}
