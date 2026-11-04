import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  register,
  resendVerificationEmail,
  resetPassword,
  updateAccount,
  verifyEmail,
} from "@/lib/auth/api";
import type { RegisterVendorPayload } from "@/lib/auth/types";
import { apiUrl, server } from "@/tests/msw/server";

// บันทึกลำดับ request: csrf-cookie ต้องมาก่อน request หลัก
function recordPost(path: string, status = 204) {
  const calls: string[] = [];
  const state: { body?: unknown } = {};
  server.use(
    http.get(apiUrl("/sanctum/csrf-cookie"), () => {
      calls.push("GET /sanctum/csrf-cookie");
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(apiUrl(path), async ({ request }) => {
      calls.push(`POST ${path}`);
      state.body = await request.json().catch(() => undefined);
      return new HttpResponse(null, { status });
    }),
  );
  return { calls, state };
}

describe("login", () => {
  it("fetches the csrf cookie first, then posts the credentials", async () => {
    const { calls, state } = recordPost("/api/v1/auth/login");
    const payload = { identifier: "officer", password: "secret", remember: true };

    await login(payload);

    expect(calls).toEqual(["GET /sanctum/csrf-cookie", "POST /api/v1/auth/login"]);
    expect(state.body).toEqual(payload);
  });

  it("rejects when the backend rejects the credentials", async () => {
    recordPost("/api/v1/auth/login", 422);
    await expect(login({ identifier: "a", password: "b", remember: false })).rejects.toThrow();
  });
});

describe("register", () => {
  it("fetches the csrf cookie first, then posts the payload", async () => {
    const { calls, state } = recordPost("/api/v1/auth/register", 201);
    const payload: RegisterVendorPayload = {
      vendorType: "individual",
      fullName: "สมชาย ใจดี",
      idCard: "1234567890123",
      phone: "0812345678",
      username: "somchai",
      email: "somchai@example.com",
      password: "Secret123!",
      confirmPassword: "Secret123!",
      password_confirmation: "Secret123!",
      terms: true,
    };

    await register(payload);

    expect(calls).toEqual(["GET /sanctum/csrf-cookie", "POST /api/v1/auth/register"]);
    expect(state.body).toEqual(payload);
  });
});

describe("logout", () => {
  it("posts to logout without fetching the csrf cookie", async () => {
    const { calls } = recordPost("/api/v1/auth/logout");

    await logout();

    expect(calls).toEqual(["POST /api/v1/auth/logout"]);
  });
});

describe("verifyEmail", () => {
  it("gets the verify url with id and hash in the path and expires/signature in the query", async () => {
    let url: URL | undefined;
    let method: string | undefined;
    server.use(
      http.get(apiUrl("/api/v1/auth/email/verify/:id/:hash"), ({ request, params }) => {
        url = new URL(request.url);
        method = request.method;
        expect(params).toEqual({ id: "7", hash: "abc123" });
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await verifyEmail({ id: "7", hash: "abc123", expires: "1700000000", signature: "sig==" });

    expect(method).toBe("GET");
    expect(url!.pathname).toBe("/api/v1/auth/email/verify/7/abc123");
    expect(Object.fromEntries(url!.searchParams)).toEqual({
      expires: "1700000000",
      signature: "sig==",
    });
  });
});

describe("resendVerificationEmail", () => {
  it("fetches the csrf cookie first, then posts the email", async () => {
    const { calls, state } = recordPost("/api/v1/auth/email/resend");

    await resendVerificationEmail("a@example.com");

    expect(calls).toEqual(["GET /sanctum/csrf-cookie", "POST /api/v1/auth/email/resend"]);
    expect(state.body).toEqual({ email: "a@example.com" });
  });
});

describe("forgotPassword", () => {
  it("fetches the csrf cookie first, then posts the email", async () => {
    const { calls, state } = recordPost("/api/v1/auth/password/forgot");

    await forgotPassword("a@example.com");

    expect(calls).toEqual(["GET /sanctum/csrf-cookie", "POST /api/v1/auth/password/forgot"]);
    expect(state.body).toEqual({ email: "a@example.com" });
  });
});

describe("resetPassword", () => {
  it("fetches the csrf cookie first, then posts the payload", async () => {
    const { calls, state } = recordPost("/api/v1/auth/password/reset");
    const payload = {
      token: "tok",
      email: "a@example.com",
      password: "NewSecret1!",
      password_confirmation: "NewSecret1!",
    };

    await resetPassword(payload);

    expect(calls).toEqual(["GET /sanctum/csrf-cookie", "POST /api/v1/auth/password/reset"]);
    expect(state.body).toEqual(payload);
  });
});

describe("updateAccount", () => {
  it("posts the payload without fetching the csrf cookie", async () => {
    const { calls, state } = recordPost("/api/v1/auth/account");

    await updateAccount({ username: "new", email: "new@example.com" });

    expect(calls).toEqual(["POST /api/v1/auth/account"]);
    expect(state.body).toEqual({ username: "new", email: "new@example.com" });
  });
});

describe("changePassword", () => {
  it("posts the payload without fetching the csrf cookie", async () => {
    const { calls, state } = recordPost("/api/v1/auth/password/change");
    const payload = { currentPassword: "old", password: "new", password_confirmation: "new" };

    await changePassword(payload);

    expect(calls).toEqual(["POST /api/v1/auth/password/change"]);
    expect(state.body).toEqual(payload);
  });
});
