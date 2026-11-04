import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useCreateTenderProject } from "@/lib/tender/tender-projects/mutations/useCreateTenderProject";
import type { CreateTenderProjectPayload } from "@/lib/tender/tender-projects/types";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tender-projects");
const PAYLOAD: CreateTenderProjectPayload = {
  name: "จัดซื้อครุภัณฑ์",
  budget: 1000,
  departmentId: 2,
  procurementMethod: "คัดเลือก",
  fiscalYear: 2569,
};

describe("useCreateTenderProject", () => {
  it("posts the payload, resolves with the code and invalidates tenders_projects", async () => {
    let body: unknown;
    server.use(
      http.post(URL_, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: { projectCode: "TP-2569-010" } }, { status: 201 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateTenderProject());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual({ projectCode: "TP-2569-010" });
    });

    expect(body).toEqual(PAYLOAD);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });

  it("still invalidates tenders_projects when the request fails", async () => {
    server.use(http.post(URL_, () => HttpResponse.json({ message: "ซ้ำ" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateTenderProject());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toMatchObject({ response: { status: 422 } });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });
});
