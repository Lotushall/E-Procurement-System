import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useCreateUser } from "@/lib/user/management/mutations/useCreateUser";
import { makeUserDetail } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users");
const PAYLOAD = {
  username: "new",
  email: "new@example.com",
  password: "secret123",
  role: "officer",
  permissions: ["users.update"],
  internalProfileId: 4,
};

describe("useCreateUser", () => {
  it("posts the payload, resolves with the created user and invalidates users and internal_profiles", async () => {
    let body: unknown;
    const created = makeUserDetail({ id: 30 });
    server.use(
      http.post(URL_, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateUser());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual(created);
    });

    expect(body).toEqual(PAYLOAD);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["internal_profiles"] });
  });

  it("still invalidates both when the request fails", async () => {
    server.use(http.post(URL_, () => HttpResponse.json({ message: "ซ้ำ" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateUser());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["internal_profiles"] });
  });
});
