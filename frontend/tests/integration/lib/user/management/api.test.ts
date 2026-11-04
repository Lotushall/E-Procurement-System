import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import {
  createPermission,
  createRole,
  createUser,
  deletePermission,
  deleteRole,
  deleteUser,
  fetchPermissions,
  fetchRoles,
  fetchUserDetail,
  fetchUserList,
  fetchUserSessions,
  revokeAllUserSessions,
  revokeUserSession,
  updatePermission,
  updateRole,
  updateUser,
  updateUserStatus,
} from "@/lib/user/management/api";
import { paginated } from "@/tests/fixtures/pagination";
import { makeManagedUser, makePermission, makeRole, makeUserDetail, makeUserSession } from "@/tests/fixtures/user-management";
import { apiUrl, server } from "@/tests/msw/server";

const USERS = apiUrl("/api/v1/dashboard/users");
const USER = apiUrl("/api/v1/dashboard/users/:id");

describe("fetchUserList", () => {
  it("sends the filters with page and per_page, and maps meta", async () => {
    let query: URLSearchParams | undefined;
    const row = makeManagedUser({ id: 4 });
    server.use(
      http.get(USERS, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([row], { currentPage: 2, lastPage: 5, perPage: 10, total: 44, extra: "x" }));
      }),
    );

    const result = await fetchUserList(
      { type: "company", status: "pending", search: "สม", sort_by: "email", sort_direction: "asc" },
      2,
      10,
    );

    expect(Object.fromEntries(query!)).toEqual({
      type: "company",
      status: "pending",
      search: "สม",
      sort_by: "email",
      sort_direction: "asc",
      page: "2",
      per_page: "10",
    });
    expect(result).toEqual({ data: [row], meta: { currentPage: 2, lastPage: 5, perPage: 10, total: 44 } });
  });

  it("defaults to page 1 of 20 without filters", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(USERS, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([]));
      }),
    );

    await fetchUserList();

    expect(Object.fromEntries(query!)).toEqual({ page: "1", per_page: "20" });
  });

  it("omits undefined filters from the query string", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(USERS, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([]));
      }),
    );

    await fetchUserList({ type: undefined, status: "active", search: undefined });

    expect(Object.fromEntries(query!)).toEqual({ status: "active", page: "1", per_page: "20" });
  });

  it("rejects when the server fails", async () => {
    server.use(http.get(USERS, () => HttpResponse.json({ message: "x" }, { status: 500 })));

    await expect(fetchUserList()).rejects.toThrow();
  });
});

describe("fetchUserDetail", () => {
  it("requests the user by id and returns the detail", async () => {
    let id: unknown;
    const detail = makeUserDetail({ id: 7, permissions: ["users.update"] });
    server.use(
      http.get(USER, ({ params }) => {
        id = params.id;
        return HttpResponse.json({ data: detail });
      }),
    );

    await expect(fetchUserDetail(7)).resolves.toEqual(detail);
    expect(id).toBe("7");
  });

  it("normalises missing optional fields to null / empty array", async () => {
    const full = makeUserDetail({ id: 8 });
    const bare: Record<string, unknown> = { ...full };
    for (const key of ["role", "internalProfile", "permissions", "emailVerifiedAt", "lastLoginAt", "passwordChangedAt"]) {
      delete bare[key];
    }
    server.use(http.get(USER, () => HttpResponse.json({ data: bare })));

    const result = await fetchUserDetail(8);

    expect(result).toEqual({
      ...bare,
      role: null,
      internalProfile: null,
      permissions: [],
      emailVerifiedAt: null,
      lastLoginAt: null,
      passwordChangedAt: null,
    });
  });

  it("turns a null permissions list into an empty array and keeps other nulls", async () => {
    const detail = makeUserDetail({ role: null, internalProfile: null, permissions: null, lastLoginAt: null });
    server.use(http.get(USER, () => HttpResponse.json({ data: detail })));

    const result = await fetchUserDetail(1);

    expect(result.role).toBeNull();
    expect(result.internalProfile).toBeNull();
    expect(result.permissions).toEqual([]);
    expect(result.lastLoginAt).toBeNull();
  });

  it("rejects on 404", async () => {
    server.use(http.get(USER, () => HttpResponse.json({ message: "Not found" }, { status: 404 })));

    await expect(fetchUserDetail(99)).rejects.toThrow();
  });
});

describe("fetchUserSessions", () => {
  it("returns the sessions of the user", async () => {
    let id: unknown;
    const sessions = [makeUserSession({ id: "a" }), makeUserSession({ id: "b", current: true })];
    server.use(
      http.get(apiUrl("/api/v1/dashboard/users/:id/sessions"), ({ params }) => {
        id = params.id;
        return HttpResponse.json({ data: sessions });
      }),
    );

    await expect(fetchUserSessions(5)).resolves.toEqual(sessions);
    expect(id).toBe("5");
  });
});

describe("revokeUserSession", () => {
  it("deletes the single session of the user", async () => {
    let seen: Record<string, unknown> | undefined;
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/users/:id/sessions/:sessionId"), ({ params }) => {
        seen = params;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(revokeUserSession(5, "abc-123")).resolves.toBeUndefined();
    expect(seen).toEqual({ id: "5", sessionId: "abc-123" });
  });
});

describe("revokeAllUserSessions", () => {
  const URL_ = apiUrl("/api/v1/dashboard/users/:id/sessions");

  it("sends keep_current=1 when the current session is kept", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.delete(URL_, ({ request }) => {
        query = new URL(request.url).searchParams;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await revokeAllUserSessions(5, true);

    expect(Object.fromEntries(query!)).toEqual({ keep_current: "1" });
  });

  it("sends no query string when every session is revoked", async () => {
    let search: string | undefined;
    server.use(
      http.delete(URL_, ({ request }) => {
        search = new URL(request.url).search;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await revokeAllUserSessions(5, false);

    expect(search).toBe("");
  });
});

describe("createUser", () => {
  it("posts the payload and returns the created user", async () => {
    let body: unknown;
    const created = makeUserDetail({ id: 20 });
    server.use(
      http.post(USERS, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );
    const payload = {
      username: "new",
      email: "n@example.com",
      password: "secret123",
      role: "officer",
      permissions: ["users.update"],
      internalProfileId: 3,
    };

    await expect(createUser(payload)).resolves.toEqual(created);
    expect(body).toEqual(payload);
  });
});

describe("updateUser", () => {
  it("patches the user by id with the payload", async () => {
    let seen: { id: unknown; body: unknown } | undefined;
    const updated = makeUserDetail({ id: 9, username: "renamed" });
    server.use(
      http.patch(USER, async ({ params, request }) => {
        seen = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: updated });
      }),
    );

    await expect(updateUser(9, { username: "renamed", email: "r@example.com" })).resolves.toEqual(updated);
    expect(seen).toEqual({ id: "9", body: { username: "renamed", email: "r@example.com" } });
  });
});

describe("updateUserStatus", () => {
  it("patches /status and resolves with the new status only", async () => {
    let seen: { id: unknown; body: unknown } | undefined;
    server.use(
      http.patch(apiUrl("/api/v1/dashboard/users/:id/status"), async ({ params, request }) => {
        seen = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: { status: "suspended" } });
      }),
    );

    await expect(updateUserStatus(3, "suspended")).resolves.toBe("suspended");
    expect(seen).toEqual({ id: "3", body: { status: "suspended" } });
  });
});

describe("deleteUser", () => {
  it("deletes the user by id", async () => {
    let id: unknown;
    server.use(
      http.delete(USER, ({ params }) => {
        id = params.id;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(deleteUser(12)).resolves.toBeUndefined();
    expect(id).toBe("12");
  });
});

describe("fetchRoles / fetchPermissions", () => {
  it("returns the roles", async () => {
    const roles = [makeRole({ id: 1, name: "admin" }), makeRole({ id: 2, name: "officer", userCount: 4 })];
    server.use(http.get(apiUrl("/api/v1/dashboard/roles"), () => HttpResponse.json({ data: roles })));

    await expect(fetchRoles()).resolves.toEqual(roles);
  });

  it("returns the permissions", async () => {
    const permissions = [
      makePermission(),
      makePermission({ name: "vendors.approve", label: "อนุมัติผู้ค้า", group: "vendors" }),
    ];
    server.use(http.get(apiUrl("/api/v1/dashboard/permissions"), () => HttpResponse.json({ data: permissions })));

    await expect(fetchPermissions()).resolves.toEqual(permissions);
  });
});

describe("role mutations", () => {
  it("createRole posts the payload", async () => {
    let body: unknown;
    const role = makeRole({ id: 5, name: "auditor", permissions: ["users.viewAny"] });
    server.use(
      http.post(apiUrl("/api/v1/dashboard/roles"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: role }, { status: 201 });
      }),
    );

    await expect(createRole({ name: "auditor", permissions: ["users.viewAny"] })).resolves.toEqual(role);
    expect(body).toEqual({ name: "auditor", permissions: ["users.viewAny"] });
  });

  it("updateRole patches the role by id", async () => {
    let seen: { id: unknown; body: unknown } | undefined;
    const role = makeRole({ id: 5, name: "auditor2" });
    server.use(
      http.patch(apiUrl("/api/v1/dashboard/roles/:id"), async ({ params, request }) => {
        seen = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: role });
      }),
    );

    await expect(updateRole(5, { name: "auditor2", permissions: [] })).resolves.toEqual(role);
    expect(seen).toEqual({ id: "5", body: { name: "auditor2", permissions: [] } });
  });

  it("deleteRole deletes the role by id", async () => {
    let id: unknown;
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/roles/:id"), ({ params }) => {
        id = params.id;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(deleteRole(5)).resolves.toBeUndefined();
    expect(id).toBe("5");
  });
});

describe("permission mutations", () => {
  const PERMISSION = apiUrl("/api/v1/dashboard/permissions/:name");

  it("createPermission posts the payload", async () => {
    let body: unknown;
    const permission = makePermission({ name: "reports.view", label: "ดูรายงาน", group: "reports" });
    server.use(
      http.post(apiUrl("/api/v1/dashboard/permissions"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: permission }, { status: 201 });
      }),
    );

    await expect(createPermission({ name: "reports.view", label: "ดูรายงาน" })).resolves.toEqual(permission);
    expect(body).toEqual({ name: "reports.view", label: "ดูรายงาน" });
  });

  it("updatePermission patches by name, URL-encoding it", async () => {
    let seen: { path: string; body: unknown } | undefined;
    const permission = makePermission({ name: "a b" });
    server.use(
      http.patch(PERMISSION, async ({ request }) => {
        seen = { path: new URL(request.url).pathname, body: await request.json() };
        return HttpResponse.json({ data: permission });
      }),
    );

    await expect(updatePermission("a b", { name: "a b", label: "L" })).resolves.toEqual(permission);
    expect(seen).toEqual({ path: "/api/v1/dashboard/permissions/a%20b", body: { name: "a b", label: "L" } });
  });

  it("deletePermission deletes by name", async () => {
    let path: string | undefined;
    server.use(
      http.delete(PERMISSION, ({ request }) => {
        path = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(deletePermission("users.create")).resolves.toBeUndefined();
    expect(path).toBe("/api/v1/dashboard/permissions/users.create");
  });
});
