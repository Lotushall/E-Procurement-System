import { useMutation } from "@tanstack/react-query";
import { register } from "@/lib/auth/api";
import type { RegisterVendorPayload } from "@/lib/auth/types";

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterVendorPayload) => register(payload),
  });
}
