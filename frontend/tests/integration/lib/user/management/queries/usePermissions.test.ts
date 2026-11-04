import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import { makePermission } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/permissions");

describe("usePermissions", () => {
  it("loads the permissions and caches them under the users/permissions key", async () => {
    const permissions = [makePermission(), makePermission({ name: "users.create", label: "สร้างผู้ใช้" })];
    server.use(http.get(URL_, () => HttpResponse.json({ data: permissions })));

    const { result, queryClient } = renderHookWithQueryClient(() => usePermissions());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(permissions);
    expect(queryClient.getQueryData(["users", "permissions"])).toEqual(permissions);
  });

  it("reports an error when the request is forbidden", async () => {
    server.use(http.get(URL_, () => HttpResponse.json({ message: "forbidden" }, { status: 403 })));

    const { result } = renderHookWithQueryClient(() => usePermissions());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
