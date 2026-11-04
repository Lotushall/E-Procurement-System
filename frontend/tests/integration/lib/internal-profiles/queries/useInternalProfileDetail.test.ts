import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useInternalProfileDetail } from "@/lib/internal-profiles/queries/useInternalProfileDetail";
import { makeInternalProfile } from "@/tests/fixtures/internal-profiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DETAIL_URL = apiUrl("/api/v1/dashboard/internal-profiles/:id");

describe("useInternalProfileDetail", () => {
  it("loads the profile for the id and caches it under the detail key", async () => {
    const profile = makeInternalProfile({ id: 12 });
    const requested = vi.fn();
    server.use(
      http.get(DETAIL_URL, ({ params }) => {
        requested(params.id);
        return HttpResponse.json({ data: profile });
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useInternalProfileDetail(12));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(profile);
    expect(requested).toHaveBeenCalledWith("12");
    expect(queryClient.getQueryData(["internal_profiles", "detail", 12])).toEqual(profile);
  });

  it.each([
    ["zero", 0, true],
    ["negative", -1, true],
    ["NaN", Number.NaN, true],
    ["Infinity", Number.POSITIVE_INFINITY, true],
    ["a valid id with enabled=false", 5, false],
  ])("makes no request when the id is %s", async (_name, id, enabled) => {
    const requested = vi.fn();
    server.use(
      http.get(DETAIL_URL, () => {
        requested();
        return HttpResponse.json({ data: makeInternalProfile() });
      }),
    );

    const { result } = renderHookWithQueryClient(() => useInternalProfileDetail(id, enabled));

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);
    expect(requested).not.toHaveBeenCalled();
  });

  it("starts fetching once enabled flips to true", async () => {
    const profile = makeInternalProfile({ id: 3 });
    server.use(http.get(DETAIL_URL, () => HttpResponse.json({ data: profile })));

    let enabled = false;
    const { result, rerender } = renderHookWithQueryClient(() => useInternalProfileDetail(3, enabled));
    expect(result.current.fetchStatus).toBe("idle");

    enabled = true;
    rerender();

    await waitFor(() => expect(result.current.data).toEqual(profile));
  });

  it("reports an error when the profile does not exist", async () => {
    server.use(http.get(DETAIL_URL, () => HttpResponse.json({ message: "Not found" }, { status: 404 })));

    const { result } = renderHookWithQueryClient(() => useInternalProfileDetail(99));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
