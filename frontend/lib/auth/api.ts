import { isAxiosError } from "axios";
import { api, ensureCsrfCookie } from "@/lib/api";
import type { LoginPayload, RegisterVendorPayload, User, VerifyEmailParams } from "@/lib/auth/types";

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<User>("/api/user");
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function login(payload: LoginPayload): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/login", payload);
}

export async function register(payload: RegisterVendorPayload): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/api/v1/auth/register", payload);
}

export async function logout(): Promise<void> {
  await api.post("/logout");
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
