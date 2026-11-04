import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  useAuthPermissions,
  useHasAllPermissions,
  useHasAllRoles,
  useHasAnyPermission,
  useHasAnyRole,
} from "@/lib/auth/permissions";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";

describe("useAuthPermissions", () => {
  it("returns checkers bound to the signed-in user", async () => {
    const user = signInAs({ roles: ["officer", "reviewer"], permissions: ["tors.viewAny", "tors.create"] });

    const { result } = renderHookWithQueryClient(() => useAuthPermissions());
    await waitFor(() => expect(result.current.user).toEqual(user));

    expect(result.current.hasRole("officer")).toBe(true);
    expect(result.current.hasRole("admin")).toBe(false);
    expect(result.current.hasAnyRole(["admin", "reviewer"])).toBe(true);
    expect(result.current.hasAnyRole(["admin"])).toBe(false);
    expect(result.current.hasAllRoles(["officer", "reviewer"])).toBe(true);
    expect(result.current.hasAllRoles(["officer", "admin"])).toBe(false);
    expect(result.current.hasPermission("tors.create")).toBe(true);
    expect(result.current.hasPermission("tors.delete")).toBe(false);
    expect(result.current.hasAnyPermission(["tors.delete", "tors.create"])).toBe(true);
    expect(result.current.hasAnyPermission(["tors.delete"])).toBe(false);
    expect(result.current.hasAllPermissions(["tors.viewAny", "tors.create"])).toBe(true);
    expect(result.current.hasAllPermissions(["tors.viewAny", "tors.delete"])).toBe(false);
  });

  it("returns false from every checker while signed out", async () => {
    signOut();

    const { result, queryClient } = renderHookWithQueryClient(() => useAuthPermissions());
    await waitFor(() => expect(queryClient.getQueryData(["auth", "user"])).toBeNull());

    expect(result.current.user).toBeNull();
    expect(result.current.hasRole("admin")).toBe(false);
    expect(result.current.hasAnyRole(["admin"])).toBe(false);
    expect(result.current.hasAllRoles(["admin"])).toBe(false);
    expect(result.current.hasPermission("tors.viewAny")).toBe(false);
    expect(result.current.hasAnyPermission(["tors.viewAny"])).toBe(false);
    expect(result.current.hasAllPermissions(["tors.viewAny"])).toBe(false);
  });
});

describe("useHasAnyRole / useHasAllRoles", () => {
  it("reflect the signed-in user's roles", async () => {
    signInAs({ roles: ["officer", "reviewer"] });

    const any = renderHookWithQueryClient(() => useHasAnyRole(["admin", "reviewer"]));
    const anyNone = renderHookWithQueryClient(() => useHasAnyRole(["admin"]));
    const all = renderHookWithQueryClient(() => useHasAllRoles(["officer", "reviewer"]));
    const allMissing = renderHookWithQueryClient(() => useHasAllRoles(["officer", "admin"]));

    await waitFor(() => expect(any.result.current).toBe(true));
    await waitFor(() => expect(all.result.current).toBe(true));
    expect(anyNone.result.current).toBe(false);
    expect(allMissing.result.current).toBe(false);
  });

  it("return false while signed out", async () => {
    signOut();

    const any = renderHookWithQueryClient(() => useHasAnyRole(["admin"]));
    const all = renderHookWithQueryClient(() => useHasAllRoles(["admin"]));
    await waitFor(() => expect(any.queryClient.getQueryData(["auth", "user"])).toBeNull());
    await waitFor(() => expect(all.queryClient.getQueryData(["auth", "user"])).toBeNull());

    expect(any.result.current).toBe(false);
    expect(all.result.current).toBe(false);
  });
});

describe("useHasAnyPermission / useHasAllPermissions", () => {
  it("reflect the signed-in user's permissions", async () => {
    signInAs({ permissions: ["tors.viewAny", "tors.create"] });

    const any = renderHookWithQueryClient(() => useHasAnyPermission(["tors.delete", "tors.create"]));
    const anyNone = renderHookWithQueryClient(() => useHasAnyPermission(["tors.delete"]));
    const all = renderHookWithQueryClient(() => useHasAllPermissions(["tors.viewAny", "tors.create"]));
    const allMissing = renderHookWithQueryClient(() => useHasAllPermissions(["tors.viewAny", "tors.delete"]));

    await waitFor(() => expect(any.result.current).toBe(true));
    await waitFor(() => expect(all.result.current).toBe(true));
    expect(anyNone.result.current).toBe(false);
    expect(allMissing.result.current).toBe(false);
  });

  it("return false while signed out", async () => {
    signOut();

    const any = renderHookWithQueryClient(() => useHasAnyPermission(["tors.viewAny"]));
    const all = renderHookWithQueryClient(() => useHasAllPermissions(["tors.viewAny"]));
    await waitFor(() => expect(any.queryClient.getQueryData(["auth", "user"])).toBeNull());
    await waitFor(() => expect(all.queryClient.getQueryData(["auth", "user"])).toBeNull());

    expect(any.result.current).toBe(false);
    expect(all.result.current).toBe(false);
  });
});
