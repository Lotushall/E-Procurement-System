import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { makeRole } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/roles");

describe("useRoles", () => {
  it("loads the roles and caches them under the users/roles key", async () => {
    const roles = [makeRole({ id: 1, name: "admin" }), makeRole({ id: 2, name: "officer", userCount: 3 })];
    server.use(http.get(URL_, () => HttpResponse.json({ data: roles })));

    const { result, queryClient } = renderHookWithQueryClient(() => useRoles());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(roles);
    expect(queryClient.getQueryData(["users", "roles"])).toEqual(roles);
  });

  it("reports an error when the request fails", async () => {
    server.use(http.get(URL_, () => HttpResponse.json({ message: "boom" }, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useRoles());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
