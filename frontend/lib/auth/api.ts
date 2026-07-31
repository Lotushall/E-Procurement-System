import { isAxiosError } from "axios";
import { api, ensureCsrfCookie } from "@/lib/api";
import type {
  ChangePasswordPayload,
  CurrentUser,
  LoginPayload,
  RegisterVendorPayload,
  ResetPasswordPayload,
  UpdateAccountPayload,
  VerifyEmailParams,
} from "@/lib/auth/types";

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { data } = await api.get<{ data: CurrentUser }>("/api/v1/auth/user");
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

export async function verifyEmail({
  id,
  hash,
  expires,
  signature,
}: VerifyEmailParams): Promise<void> {
  await api.get(`/api/v1/auth/email/verify/${id}/${hash}`, {
    params: { expires, signature },
  });
}

export async function resendVerificationEmail(email: string): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/api/v1/auth/email/resend", { email });
}

export async function forgotPassword(email: string): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/api/v1/auth/password/forgot", { email });
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/api/v1/auth/password/reset", payload);
}

export async function updateAccount(
  payload: UpdateAccountPayload,
): Promise<void> {
  await api.post("/api/v1/auth/account", payload);
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  await api.post("/api/v1/auth/password/change", payload);
}
