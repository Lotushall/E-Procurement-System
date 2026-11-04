import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useInternalProfileOptions } from "@/lib/internal-profiles/queries/useInternalProfileOptions";
import { makeInternalProfileOption } from "@/tests/fixtures/internal-profiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useInternalProfileOptions", () => {
  it("loads the rows and caches them under the query key", async () => {
    const rows = [makeInternalProfileOption({ id: 1 }), makeInternalProfileOption({ id: 2, name: "รายการที่สอง" })];
    server.use(http.get(apiUrl("/api/v1/dashboard/internal-profiles/select"), () => HttpResponse.json({ data: rows })));

    const { result, queryClient } = renderHookWithQueryClient(() => useInternalProfileOptions());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
    expect(queryClient.getQueryData(["internal_profiles", "select"])).toEqual(rows);
  });

  it("reports an error when the request fails", async () => {
    server.use(http.get(apiUrl("/api/v1/dashboard/internal-profiles/select"), () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useInternalProfileOptions());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
