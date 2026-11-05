import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import {
  createTenderProject,
  deleteTenderProject,
  fetchTenderProjectDetail,
  fetchTenderProjectOptions,
  fetchTenderProjectsList,
  updateTenderProject,
  updateTenderProjectStatus,
} from "@/lib/tender/tender-projects/api";
import type { CreateTenderProjectPayload } from "@/lib/tender/tender-projects/types";
import { paginated } from "@/tests/fixtures/pagination";
import { makeTenderProject, makeTenderProjectOption, makeTenderProjectStats } from "@/tests/fixtures/tender-projects";
import { apiUrl, server } from "@/tests/msw/server";

const BASE = "/api/v1/dashboard/tender-projects";
const PAYLOAD: CreateTenderProjectPayload = {
  name: "จัดซื้อครุภัณฑ์",
  budget: 500000.5,
  departmentId: 3,
  procurementMethod: "คัดเลือก",
  fiscalYear: 2026,
};

describe("fetchTenderProjectsList", () => {
  it("defaults to page 1 of 20 with no filters", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl(BASE), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([], { stats: makeTenderProjectStats() }));
      }),
    );

    await fetchTenderProjectsList();

    expect(Object.fromEntries(query!)).toEqual({ page: "1", per_page: "20" });
  });

  it("sends every filter with the page and page size", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl(BASE), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([], { stats: makeTenderProjectStats() }));
      }),
    );

    await fetchTenderProjectsList(
      {
        search: "คอม",
        status: "published",
        department_id: 4,
        fiscal_year: "2026",
        date_from: "2026-01-01",
        date_to: "2026-06-30",
        sort_by: "budget",
        sort_direction: "asc",
      },
      3,
      50,
    );

    expect(Object.fromEntries(query!)).toEqual({
      search: "คอม",
      status: "published",
      department_id: "4",
      fiscal_year: "2026",
      date_from: "2026-01-01",
      date_to: "2026-06-30",
      sort_by: "budget",
      sort_direction: "asc",
      page: "3",
      per_page: "50",
    });
  });

  it("returns the rows and maps meta including stats, dropping unrelated meta keys", async () => {
    const rows = [makeTenderProject({ id: 1 }), makeTenderProject({ id: 2, projectCode: "TP-2026-002" })];
    const stats = makeTenderProjectStats({ totalCount: 90, totalBudget: 1234.5, inProgressCount: 4, completedCount: 6 });
    server.use(
      http.get(apiUrl(BASE), () =>
        HttpResponse.json({
          data: rows,
          meta: { currentPage: 2, lastPage: 5, perPage: 20, total: 90, from: 21, stats },
        }),
      ),
    );

    const result = await fetchTenderProjectsList();

    expect(result.data).toEqual(rows);
    expect(result.meta).toEqual({ currentPage: 2, lastPage: 5, perPage: 20, total: 90, stats });
  });

  it("rejects when the request fails", async () => {
    server.use(http.get(apiUrl(BASE), () => new HttpResponse(null, { status: 500 })));

    await expect(fetchTenderProjectsList()).rejects.toMatchObject({ response: { status: 500 } });
  });
});

describe("createTenderProject", () => {
  it("posts the payload and returns the project code", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl(BASE), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: { projectCode: "TP-2026-009" } }, { status: 201 });
      }),
    );

    await expect(createTenderProject(PAYLOAD)).resolves.toEqual({ projectCode: "TP-2026-009" });
    expect(body).toEqual(PAYLOAD);
  });

  it("rejects on a validation error", async () => {
    server.use(http.post(apiUrl(BASE), () => HttpResponse.json({ message: "invalid" }, { status: 422 })));

    await expect(createTenderProject(PAYLOAD)).rejects.toMatchObject({ response: { status: 422 } });
  });
});

describe("fetchTenderProjectDetail", () => {
  it("gets the project by id and unwraps data", async () => {
    const project = makeTenderProject({ id: 12 });
    let id: unknown;
    server.use(
      http.get(apiUrl(`${BASE}/:id`), ({ params }) => {
        id = params.id;
        return HttpResponse.json({ data: project });
      }),
    );

    await expect(fetchTenderProjectDetail(12)).resolves.toEqual(project);
    expect(id).toBe("12");
  });

  it("rejects with the 404 response", async () => {
    server.use(http.get(apiUrl(`${BASE}/:id`), () => new HttpResponse(null, { status: 404 })));

    await expect(fetchTenderProjectDetail(99)).rejects.toMatchObject({ response: { status: 404 } });
  });
});

describe("updateTenderProject", () => {
  it("puts the payload to the project and returns the project code", async () => {
    let received: { id: unknown; body: unknown } | undefined;
    server.use(
      http.put(apiUrl(`${BASE}/:id`), async ({ params, request }) => {
        received = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: { projectCode: "TP-2026-001" } });
      }),
    );

    await expect(updateTenderProject(5, PAYLOAD)).resolves.toEqual({ projectCode: "TP-2026-001" });
    expect(received).toEqual({ id: "5", body: PAYLOAD });
  });
});

describe("updateTenderProjectStatus", () => {
  it("patches only the status and returns the new status from the response", async () => {
    let received: { id: unknown; body: unknown } | undefined;
    server.use(
      http.patch(apiUrl(`${BASE}/:id/status`), async ({ params, request }) => {
        received = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: makeTenderProject({ id: 5, status: "closed" }) });
      }),
    );

    await expect(updateTenderProjectStatus(5, "closed")).resolves.toBe("closed");
    expect(received).toEqual({ id: "5", body: { status: "closed" } });
  });

  it("rejects when the transition is refused", async () => {
    server.use(
      http.patch(apiUrl(`${BASE}/:id/status`), () => HttpResponse.json({ message: "ไม่อนุญาต" }, { status: 422 })),
    );

    await expect(updateTenderProjectStatus(5, "draft")).rejects.toMatchObject({ response: { status: 422 } });
  });
});

describe("deleteTenderProject", () => {
  it("deletes the project by id and resolves with nothing", async () => {
    let id: unknown;
    server.use(
      http.delete(apiUrl(`${BASE}/:id`), ({ params }) => {
        id = params.id;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(deleteTenderProject(8)).resolves.toBeUndefined();
    expect(id).toBe("8");
  });
});

describe("fetchTenderProjectOptions", () => {
  it("gets the select options and unwraps data", async () => {
    const options = [makeTenderProjectOption({ id: 1 }), makeTenderProjectOption({ id: 2, projectCode: "TP-2026-002" })];
    server.use(http.get(apiUrl(`${BASE}/select`), () => HttpResponse.json({ data: options })));

    await expect(fetchTenderProjectOptions()).resolves.toEqual(options);
  });

  it("sends no filter when called without params", async () => {
    let search = "";
    server.use(
      http.get(apiUrl(`${BASE}/select`), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ data: [] });
      }),
    );

    await fetchTenderProjectOptions();

    expect(search).toBe("");
  });

  it("sends department_id and open_for_tor as 1 when asked", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl(`${BASE}/select`), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ data: [] });
      }),
    );

    await fetchTenderProjectOptions({ department_id: 3, open_for_tor: true });

    expect(query?.get("department_id")).toBe("3");
    expect(query?.get("open_for_tor")).toBe("1");
  });
});
