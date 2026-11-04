import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useLogin } from "@/lib/auth/mutations/useLogin";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const payload = { identifier: "officer", password: "secret", remember: false };
const csrf = http.get(apiUrl("/sanctum/csrf-cookie"), () => new HttpResponse(null, { status: 204 }));

describe("useLogin", () => {
  it("posts the credentials and invalidates the current user on success", async () => {
    let body: unknown;
    server.use(
      csrf,
      http.post(apiUrl("/api/v1/auth/login"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useLogin());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync(payload));

    expect(body).toEqual(payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["auth", "user"] });
  });

  it("does not invalidate the current user when login fails", async () => {
    server.use(
      csrf,
      http.post(apiUrl("/api/v1/auth/login"), () => HttpResponse.json({ message: "no" }, { status: 422 })),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useLogin());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).rejects.toThrow();
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
