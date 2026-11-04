import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useVendorDetail } from "@/lib/vendor/approval/queries/useVendorDetail";
import { makeVendorDetail } from "@/tests/fixtures/vendor-approval";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useVendorDetail", () => {
  it("fetches the vendor and caches it under the detail key", async () => {
    const detail = makeVendorDetail({ id: 12 });
    server.use(http.get(apiUrl("/api/v1/vendors/12"), () => HttpResponse.json({ data: detail })));

    const { result, queryClient } = renderHookWithQueryClient(() => useVendorDetail(12));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(detail);
    expect(queryClient.getQueryData(["vendors", "detail", 12])).toEqual(detail);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("is disabled and makes no request for id %s", (id) => {
    const requested = vi.fn();
    server.use(
      http.get(apiUrl("/api/v1/vendors/:id"), () => {
        requested();
        return HttpResponse.json({ data: makeVendorDetail() });
      }),
    );

    const { result } = renderHookWithQueryClient(() => useVendorDetail(id));

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);
    expect(requested).not.toHaveBeenCalled();
  });

  it("reports an error when the vendor is not found", async () => {
    server.use(http.get(apiUrl("/api/v1/vendors/99"), () => new HttpResponse(null, { status: 404 })));

    const { result } = renderHookWithQueryClient(() => useVendorDetail(99));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
