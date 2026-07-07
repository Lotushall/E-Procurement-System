import { isAxiosError } from "axios";
import { api, ensureCsrfCookie } from "@/lib/api";
import type { LoginPayload, RegisterPayload, User } from "@/lib/auth/types";

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

export async function register(payload: RegisterPayload): Promise<void> {
  await ensureCsrfCookie();
  await api.post("/register", payload);
}

export async function logout(): Promise<void> {
  await api.post("/logout");
}
