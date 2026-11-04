import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useResendVerificationEmail } from "@/lib/auth/mutations/useResendVerificationEmail";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const csrf = http.get(apiUrl("/sanctum/csrf-cookie"), () => new HttpResponse(null, { status: 204 }));
const payload = "a@example.com";

describe("useResendVerificationEmail", () => {
  it("sends the request with the payload", async () => {
    let body: unknown;
    server.use(
      csrf,
      http.post(apiUrl("/api/v1/auth/email/resend"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useResendVerificationEmail());

    await act(() => result.current.mutateAsync(payload));

    expect(body).toEqual({ email: payload });
  });

  it("propagates the error when the request fails", async () => {
    server.use(
      csrf,
      http.post(apiUrl("/api/v1/auth/email/resend"), () => HttpResponse.json({ message: "bad" }, { status: 422 })),
    );
    const { result } = renderHookWithQueryClient(() => useResendVerificationEmail());

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).rejects.toThrow();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
