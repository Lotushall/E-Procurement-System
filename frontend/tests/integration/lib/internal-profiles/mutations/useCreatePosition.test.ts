import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useCreatePosition } from "@/lib/internal-profiles/mutations/useCreatePosition";
import { makePosition } from "@/tests/fixtures/internal-profiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/positions");
const PAYLOAD = { name: "ผู้จัดการ" };

describe("useCreatePosition", () => {
  it("posts the payload, resolves with the created row and invalidates positions", async () => {
    let body: unknown;
    const created = makePosition({ id: 9 });
    server.use(
      http.post(URL_, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useCreatePosition());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual(created);
    });

    expect(body).toEqual(PAYLOAD);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["positions"] });
  });

  it("still invalidates positions when the request fails", async () => {
    server.use(http.post(URL_, () => HttpResponse.json({ message: "ซ้ำ" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useCreatePosition());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["positions"] });
  });
});
