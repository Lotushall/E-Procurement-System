import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useUpdateTenderProject } from "@/lib/tender/tender-projects/mutations/useUpdateTenderProject";
import type { UpdateTenderProjectPayload } from "@/lib/tender/tender-projects/types";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tender-projects/:id");
const PAYLOAD: UpdateTenderProjectPayload = {
  name: "จัดซื้อครุภัณฑ์ (แก้ไข)",
  budget: 2500.5,
  departmentId: 2,
  personInChargeId: 4,
  procurementMethod: "เฉพาะเจาะจง",
  fiscalYear: 2569,
  projectStartAt: "2026-01-01",
  projectEndAt: "2026-06-30",
};

describe("useUpdateTenderProject", () => {
  it("puts the payload to the project and invalidates tenders_projects", async () => {
    let received: { id: unknown; body: unknown } | undefined;
    server.use(
      http.put(URL_, async ({ params, request }) => {
        received = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: { projectCode: "TP-2569-001" } });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateTenderProject());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 5, payload: PAYLOAD })).resolves.toEqual({
        projectCode: "TP-2569-001",
      });
    });

    expect(received).toEqual({ id: "5", body: PAYLOAD });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });

  it("still invalidates tenders_projects when the request fails", async () => {
    server.use(http.put(URL_, () => HttpResponse.json({ message: "ผิดพลาด" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateTenderProject());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 5, payload: PAYLOAD })).rejects.toMatchObject({
        response: { status: 422 },
      });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });
});
