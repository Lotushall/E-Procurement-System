import axios, { isAxiosError, type InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  withXSRFToken: true,
});

export async function ensureCsrfCookie(): Promise<void> {
  await api.get("/sanctum/csrf-cookie");
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _csrfRetry?: boolean;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const config = error.config as RetryableRequestConfig;
    const status = error.response?.status;

    if (status === 401 && config.url !== "/api/user") {
      onUnauthorized?.();
      return Promise.reject(error);
    }

    if (status === 419 && !config._csrfRetry) {
      await ensureCsrfCookie();
      config._csrfRetry = true;
      return api(config);
    }

    return Promise.reject(error);
  }
);
