import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useUserSessions } from "@/lib/user/management/queries/useUserSessions";
import { makeUserSession } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users/:id/sessions");

describe("useUserSessions", () => {
  it("loads the sessions and caches them under the detail/sessions key", async () => {
    const sessions = [makeUserSession({ id: "a" }), makeUserSession({ id: "b", current: true })];
    const requested = vi.fn();
    server.use(
      http.get(URL_, ({ params }) => {
        requested(params.id);
        return HttpResponse.json({ data: sessions });
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useUserSessions(8));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sessions);
    expect(requested).toHaveBeenCalledWith("8");
    expect(queryClient.getQueryData(["users", "detail", 8, "sessions"])).toEqual(sessions);
  });

  it.each([
    ["zero", 0],
    ["negative", -4],
    ["NaN", Number.NaN],
  ])("makes no request when the id is %s", (_name, id) => {
    const requested = vi.fn();
    server.use(
      http.get(URL_, () => {
        requested();
        return HttpResponse.json({ data: [] });
      }),
    );

    const { result } = renderHookWithQueryClient(() => useUserSessions(id));

    expect(result.current.fetchStatus).toBe("idle");
    expect(requested).not.toHaveBeenCalled();
  });

  it("reports an error when the request fails", async () => {
    server.use(http.get(URL_, () => HttpResponse.json({ message: "boom" }, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useUserSessions(1));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
