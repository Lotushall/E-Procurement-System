import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import {
  createDepartment,
  createInternalProfile,
  createPosition,
  deleteDepartment,
  deleteInternalProfile,
  deletePosition,
  fetchAvailableInternalProfiles,
  fetchDepartmentList,
  fetchDepartmentOptions,
  fetchInternalProfileDetail,
  fetchInternalProfileList,
  fetchInternalProfileOptions,
  fetchPositionList,
  fetchPositionOptions,
  updateDepartment,
  updateInternalProfile,
  updatePosition,
} from "@/lib/internal-profiles/api";
import {
  makeAvailableInternalProfile,
  makeDepartment,
  makeInternalProfile,
  makeInternalProfileOption,
  makePosition,
} from "@/tests/fixtures/internal-profiles";
import { paginated } from "@/tests/fixtures/pagination";
import { apiUrl, server } from "@/tests/msw/server";

const BASE = "/api/v1/dashboard";

describe("fetchInternalProfileList", () => {
  it("sends filters with page and per_page, and maps only the pagination meta", async () => {
    let query: URLSearchParams | undefined;
    const profile = makeInternalProfile();
    server.use(
      http.get(apiUrl(`${BASE}/internal-profiles`), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(
          paginated([profile], { currentPage: 2, lastPage: 5, perPage: 10, total: 42, extra: "ignored" }),
        );
      }),
    );

    const result = await fetchInternalProfileList(
      { search: "สมชาย", sort_by: "firstname", sort_direction: "asc", department_id: 3, position_id: 4 },
      2,
      10,
    );

    expect(Object.fromEntries(query!)).toEqual({
      search: "สมชาย",
      sort_by: "firstname",
      sort_direction: "asc",
      department_id: "3",
      position_id: "4",
      page: "2",
      per_page: "10",
    });
    expect(result).toEqual({ data: [profile], meta: { currentPage: 2, lastPage: 5, perPage: 10, total: 42 } });
  });

  it("defaults to page 1 of 20 with no filters", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl(`${BASE}/internal-profiles`), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([]));
      }),
    );

    await fetchInternalProfileList();

    expect(Object.fromEntries(query!)).toEqual({ page: "1", per_page: "20" });
  });

  it("omits undefined filters from the query string", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl(`${BASE}/internal-profiles`), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([]));
      }),
    );

    await fetchInternalProfileList({ search: undefined, department_id: undefined });

    expect(Object.fromEntries(query!)).toEqual({ page: "1", per_page: "20" });
  });
});

describe("createInternalProfile", () => {
  it("posts the payload and returns the created profile", async () => {
    let body: unknown;
    const created = makeInternalProfile({ id: 9 });
    server.use(
      http.post(apiUrl(`${BASE}/internal-profiles`), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );

    const payload = { firstname: "สมชาย", lastname: "ใจดี", departmentId: 2 };
    await expect(createInternalProfile(payload)).resolves.toEqual(created);
    expect(body).toEqual(payload);
  });
});

describe("updateInternalProfile", () => {
  it("patches the profile by id and returns it", async () => {
    let body: unknown;
    let id: unknown;
    const updated = makeInternalProfile({ id: 5, firstname: "สมหญิง" });
    server.use(
      http.patch(apiUrl(`${BASE}/internal-profiles/:id`), async ({ request, params }) => {
        body = await request.json();
        id = params.id;
        return HttpResponse.json({ data: updated });
      }),
    );

    await expect(updateInternalProfile(5, { firstname: "สมหญิง", lastname: "ใจดี" })).resolves.toEqual(updated);
    expect(id).toBe("5");
    expect(body).toEqual({ firstname: "สมหญิง", lastname: "ใจดี" });
  });
});

describe("deleteInternalProfile", () => {
  it("sends DELETE for the id", async () => {
    let id: unknown;
    server.use(
      http.delete(apiUrl(`${BASE}/internal-profiles/:id`), ({ params }) => {
        id = params.id;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(deleteInternalProfile(8)).resolves.toBeUndefined();
    expect(id).toBe("8");
  });
});

describe("fetchInternalProfileDetail", () => {
  it("unwraps data for the id", async () => {
    let id: unknown;
    const profile = makeInternalProfile({ id: 6 });
    server.use(
      http.get(apiUrl(`${BASE}/internal-profiles/:id`), ({ params }) => {
        id = params.id;
        return HttpResponse.json({ data: profile });
      }),
    );

    await expect(fetchInternalProfileDetail(6)).resolves.toEqual(profile);
    expect(id).toBe("6");
  });
});

describe("select endpoints", () => {
  it("fetchDepartmentOptions unwraps data from /departments/select", async () => {
    const departments = [makeDepartment({ id: 1 }), makeDepartment({ id: 2, name: "บัญชี" })];
    server.use(http.get(apiUrl(`${BASE}/departments/select`), () => HttpResponse.json({ data: departments })));

    await expect(fetchDepartmentOptions()).resolves.toEqual(departments);
  });

  it("fetchPositionOptions unwraps data from /positions/select", async () => {
    const positions = [makePosition({ id: 1 }), makePosition({ id: 2, name: "ผู้จัดการ" })];
    server.use(http.get(apiUrl(`${BASE}/positions/select`), () => HttpResponse.json({ data: positions })));

    await expect(fetchPositionOptions()).resolves.toEqual(positions);
  });

  it("fetchAvailableInternalProfiles unwraps data from /internal-profiles/select-available", async () => {
    const available = [makeAvailableInternalProfile()];
    server.use(
      http.get(apiUrl(`${BASE}/internal-profiles/select-available`), () => HttpResponse.json({ data: available })),
    );

    await expect(fetchAvailableInternalProfiles()).resolves.toEqual(available);
  });

  it("fetchInternalProfileOptions unwraps data from /internal-profiles/select", async () => {
    const options = [makeInternalProfileOption()];
    server.use(http.get(apiUrl(`${BASE}/internal-profiles/select`), () => HttpResponse.json({ data: options })));

    await expect(fetchInternalProfileOptions()).resolves.toEqual(options);
  });
});

describe.each([
  {
    label: "department",
    path: "departments",
    make: makeDepartment,
    list: fetchDepartmentList,
    create: createDepartment,
    update: updateDepartment,
    remove: deleteDepartment,
  },
  {
    label: "position",
    path: "positions",
    make: makePosition,
    list: fetchPositionList,
    create: createPosition,
    update: updatePosition,
    remove: deletePosition,
  },
])("$label API functions", ({ path, make, list, create, update, remove }) => {
  it("lists from the collection endpoint", async () => {
    const rows = [make({ id: 1 }), make({ id: 2, name: "อื่น ๆ" })];
    server.use(http.get(apiUrl(`${BASE}/${path}`), () => HttpResponse.json({ data: rows })));

    await expect(list()).resolves.toEqual(rows);
  });

  it("posts the name and returns the created row", async () => {
    let body: unknown;
    const created = make({ id: 7, name: "ใหม่" });
    server.use(
      http.post(apiUrl(`${BASE}/${path}`), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );

    await expect(create({ name: "ใหม่" })).resolves.toEqual(created);
    expect(body).toEqual({ name: "ใหม่" });
  });

  it("patches by id and returns the updated row", async () => {
    let body: unknown;
    let id: unknown;
    const updated = make({ id: 3, name: "แก้แล้ว" });
    server.use(
      http.patch(apiUrl(`${BASE}/${path}/:id`), async ({ request, params }) => {
        body = await request.json();
        id = params.id;
        return HttpResponse.json({ data: updated });
      }),
    );

    await expect(update(3, { name: "แก้แล้ว" })).resolves.toEqual(updated);
    expect(id).toBe("3");
    expect(body).toEqual({ name: "แก้แล้ว" });
  });

  it("deletes by id", async () => {
    let id: unknown;
    server.use(
      http.delete(apiUrl(`${BASE}/${path}/:id`), ({ params }) => {
        id = params.id;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(remove(4)).resolves.toBeUndefined();
    expect(id).toBe("4");
  });
});
