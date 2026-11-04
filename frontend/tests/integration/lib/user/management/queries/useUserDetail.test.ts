import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useUserDetail } from "@/lib/user/management/queries/useUserDetail";
import { makeUserDetail } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users/:id");

describe("useUserDetail", () => {
  it("loads the user for the id and caches it under the detail key", async () => {
    const detail = makeUserDetail({ id: 12 });
    const requested = vi.fn();
    server.use(
      http.get(URL_, ({ params }) => {
        requested(params.id);
        return HttpResponse.json({ data: detail });
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useUserDetail(12));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(detail);
    expect(requested).toHaveBeenCalledWith("12");
    expect(queryClient.getQueryData(["users", "detail", 12])).toEqual(detail);
  });

  it.each([
    ["zero", 0, true],
    ["negative", -1, true],
    ["NaN", Number.NaN, true],
    ["Infinity", Number.POSITIVE_INFINITY, true],
    ["a valid id with enabled=false", 5, false],
  ])("makes no request when the id is %s", (_name, id, enabled) => {
    const requested = vi.fn();
    server.use(
      http.get(URL_, () => {
        requested();
        return HttpResponse.json({ data: makeUserDetail() });
      }),
    );

    const { result } = renderHookWithQueryClient(() => useUserDetail(id, enabled));

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);
    expect(requested).not.toHaveBeenCalled();
  });

  it("starts fetching once enabled flips to true", async () => {
    const detail = makeUserDetail({ id: 3 });
    server.use(http.get(URL_, () => HttpResponse.json({ data: detail })));

    let enabled = false;
    const { result, rerender } = renderHookWithQueryClient(() => useUserDetail(3, enabled));
    expect(result.current.fetchStatus).toBe("idle");

    enabled = true;
    rerender();

    await waitFor(() => expect(result.current.data).toEqual(detail));
  });

  it("reports an error when the user does not exist", async () => {
    server.use(http.get(URL_, () => HttpResponse.json({ message: "Not found" }, { status: 404 })));

    const { result } = renderHookWithQueryClient(() => useUserDetail(99));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
