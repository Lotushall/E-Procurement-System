import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { usePositionList } from "@/lib/internal-profiles/queries/usePositionList";
import { makePosition } from "@/tests/fixtures/internal-profiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("usePositionList", () => {
  it("loads the rows and caches them under the query key", async () => {
    const rows = [makePosition({ id: 1 }), makePosition({ id: 2, name: "รายการที่สอง" })];
    server.use(http.get(apiUrl("/api/v1/dashboard/positions"), () => HttpResponse.json({ data: rows })));

    const { result, queryClient } = renderHookWithQueryClient(() => usePositionList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
    expect(queryClient.getQueryData(["positions", "list"])).toEqual(rows);
  });

  it("reports an error when the request fails", async () => {
    server.use(http.get(apiUrl("/api/v1/dashboard/positions"), () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => usePositionList());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
