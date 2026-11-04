import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useDepartmentList } from "@/lib/internal-profiles/queries/useDepartmentList";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useDepartmentList", () => {
  it("loads the rows and caches them under the query key", async () => {
    const rows = [makeDepartment({ id: 1 }), makeDepartment({ id: 2, name: "รายการที่สอง" })];
    server.use(http.get(apiUrl("/api/v1/dashboard/departments"), () => HttpResponse.json({ data: rows })));

    const { result, queryClient } = renderHookWithQueryClient(() => useDepartmentList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
    expect(queryClient.getQueryData(["departments", "list"])).toEqual(rows);
  });

  it("treats the data as fresh for an hour", async () => {
    server.use(http.get(apiUrl("/api/v1/dashboard/departments"), () => HttpResponse.json({ data: [makeDepartment()] })));

    const { result } = renderHookWithQueryClient(() => useDepartmentList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isStale).toBe(false);
  });

  it("reports an error when the request fails", async () => {
    server.use(http.get(apiUrl("/api/v1/dashboard/departments"), () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useDepartmentList());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
