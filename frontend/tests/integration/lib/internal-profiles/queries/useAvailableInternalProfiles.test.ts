import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useAvailableInternalProfiles } from "@/lib/internal-profiles/queries/useAvailableInternalProfiles";
import { makeAvailableInternalProfile } from "@/tests/fixtures/internal-profiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useAvailableInternalProfiles", () => {
  it("loads the rows and caches them under the query key", async () => {
    const rows = [makeAvailableInternalProfile({ id: 1 }), makeAvailableInternalProfile({ id: 2, name: "รายการที่สอง" })];
    server.use(http.get(apiUrl("/api/v1/dashboard/internal-profiles/select-available"), () => HttpResponse.json({ data: rows })));

    const { result, queryClient } = renderHookWithQueryClient(() => useAvailableInternalProfiles());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
    expect(queryClient.getQueryData(["internal_profiles", "select-available"])).toEqual(rows);
  });

  it("reports an error when the request fails", async () => {
    server.use(http.get(apiUrl("/api/v1/dashboard/internal-profiles/select-available"), () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useAvailableInternalProfiles());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
