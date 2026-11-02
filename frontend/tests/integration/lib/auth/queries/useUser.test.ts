import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useUser } from "@/lib/auth/queries/useUser";
import { makeUser } from "@/tests/fixtures/users";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const CURRENT_USER_URL = apiUrl("/api/v1/auth/user");

describe("useUser", () => {
  it("returns the signed-in user", async () => {
    const user = makeUser({ roles: ["admin"] });
    server.use(http.get(CURRENT_USER_URL, () => HttpResponse.json({ data: user })));

    const { result } = renderHookWithQueryClient(() => useUser());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(user);
  });

  it("returns null when nobody is signed in", async () => {
    server.use(http.get(CURRENT_USER_URL, () => new HttpResponse(null, { status: 401 })));

    const { result } = renderHookWithQueryClient(() => useUser());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("errors on any other failure", async () => {
    server.use(http.get(CURRENT_USER_URL, () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useUser());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
