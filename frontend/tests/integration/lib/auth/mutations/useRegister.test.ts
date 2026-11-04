import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useRegister } from "@/lib/auth/mutations/useRegister";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const csrf = http.get(apiUrl("/sanctum/csrf-cookie"), () => new HttpResponse(null, { status: 204 }));
const payload = { vendorType: "company" as const, companyName: "บริษัท", taxId: "0123456789012", phone: "0812345678", username: "u", email: "u@example.com", password: "P", confirmPassword: "P", password_confirmation: "P", terms: true };

describe("useRegister", () => {
  it("sends the request with the payload", async () => {
    let body: unknown;
    server.use(
      csrf,
      http.post(apiUrl("/api/v1/auth/register"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useRegister());

    await act(() => result.current.mutateAsync(payload));

    expect(body).toEqual(payload);
  });

  it("propagates the error when the request fails", async () => {
    server.use(
      csrf,
      http.post(apiUrl("/api/v1/auth/register"), () => HttpResponse.json({ message: "bad" }, { status: 422 })),
    );
    const { result } = renderHookWithQueryClient(() => useRegister());

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).rejects.toThrow();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
