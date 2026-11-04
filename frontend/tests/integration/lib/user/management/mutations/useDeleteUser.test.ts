import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useDeleteUser } from "@/lib/user/management/mutations/useDeleteUser";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users/:id");

describe("useDeleteUser", () => {
  it("deletes the user by id and invalidates users", async () => {
    const ids: unknown[] = [];
    server.use(
      http.delete(URL_, ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteUser());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync(15);
    });

    expect(ids).toEqual(["15"]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("still invalidates users when the request fails", async () => {
    server.use(http.delete(URL_, () => HttpResponse.json({ message: "x" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteUser());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(15)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });
});
