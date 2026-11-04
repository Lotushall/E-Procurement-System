import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useLogout } from "@/lib/auth/mutations/useLogout";
import { makeUser } from "@/tests/fixtures/users";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useLogout", () => {
  it("posts to logout and clears the cached user on success", async () => {
    let method: string | undefined;
    server.use(
      http.post(apiUrl("/api/v1/auth/logout"), ({ request }) => {
        method = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useLogout());
    queryClient.setQueryData(["auth", "user"], makeUser());

    await act(() => result.current.mutateAsync());

    expect(method).toBe("POST");
    expect(queryClient.getQueryData(["auth", "user"])).toBeNull();
  });

  it("keeps the cached user when logout fails", async () => {
    server.use(http.post(apiUrl("/api/v1/auth/logout"), () => new HttpResponse(null, { status: 500 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useLogout());
    const user = makeUser();
    queryClient.setQueryData(["auth", "user"], user);

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow();
    });

    expect(queryClient.getQueryData(["auth", "user"])).toEqual(user);
  });
});
