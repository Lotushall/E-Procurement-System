import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useDepartmentOptions", () => {
  it("loads the rows and caches them under the query key", async () => {
    const rows = [makeDepartment({ id: 1 }), makeDepartment({ id: 2, name: "รายการที่สอง" })];
    server.use(http.get(apiUrl("/api/v1/dashboard/departments/select"), () => HttpResponse.json({ data: rows })));

    const { result, queryClient } = renderHookWithQueryClient(() => useDepartmentOptions());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
    expect(queryClient.getQueryData(["departments", "select"])).toEqual(rows);
  });

  it("reports an error when the request fails", async () => {
    server.use(http.get(apiUrl("/api/v1/dashboard/departments/select"), () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useDepartmentOptions());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
