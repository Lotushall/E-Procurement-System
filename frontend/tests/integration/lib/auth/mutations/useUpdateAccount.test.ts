import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useUpdateAccount } from "@/lib/auth/mutations/useUpdateAccount";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const payload = { username: "new", email: "new@example.com" };

describe("useUpdateAccount", () => {
  it("posts the payload and invalidates the current user on success", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl("/api/v1/auth/account"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateAccount());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync(payload));

    expect(body).toEqual(payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["auth", "user"] });
  });

  it("does not invalidate the current user when the update fails", async () => {
    server.use(
      http.post(apiUrl("/api/v1/auth/account"), () => HttpResponse.json({ message: "dup" }, { status: 422 })),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateAccount());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).rejects.toThrow();
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
