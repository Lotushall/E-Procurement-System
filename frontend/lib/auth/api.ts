import { isAxiosError } from "axios";
import { api, ensureCsrfCookie } from "@/lib/api";
import type { LoginPayload, RegisterVendorPayload, VerifyEmailParams } from "@/lib/auth/types";
import type { User } from "@/lib/user/types";

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<{ data: User }>("/api/v1/auth/user");
    return data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function login(payload: LoginPayload): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/api/v1/auth/login", payload);
}

export async function register(payload: RegisterVendorPayload): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/api/v1/auth/register", payload);
}

export async function logout(): Promise<void> {
  await api.post("/api/v1/auth/logout");
}

export async function verifyEmail({ id, hash, expires, signature }: VerifyEmailParams): Promise<void> {
  await api.get(`/api/v1/auth/email/verify/${id}/${hash}`, {
    params: { expires, signature },
  });
}

export async function resendVerificationEmail(email: string): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/api/v1/auth/email/resend", { email });
}
