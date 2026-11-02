import { http, HttpResponse } from "msw/http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, setUnauthorizedHandler } from "@/lib/api";
import { apiUrl, server } from "@/tests/msw/server";

describe("api client", () => {
  afterEach(() => {
    setUnauthorizedHandler(() => {});
  });

  it("calls the unauthorized handler on 401", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    server.use(http.get(apiUrl("/api/v1/tors"), () => new HttpResponse(null, { status: 401 })));

    await expect(api.get("/api/v1/tors")).rejects.toMatchObject({ response: { status: 401 } });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("does not call the unauthorized handler for the current-user check", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    server.use(http.get(apiUrl("/api/user"), () => new HttpResponse(null, { status: 401 })));

    await expect(api.get("/api/user")).rejects.toMatchObject({ response: { status: 401 } });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("refreshes the CSRF cookie and retries once on 419", async () => {
    let attempts = 0;
    const csrf = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(
      http.get(apiUrl("/sanctum/csrf-cookie"), csrf),
      http.post(apiUrl("/api/v1/tors"), () => {
        attempts += 1;
        return attempts === 1
          ? new HttpResponse(null, { status: 419 })
          : HttpResponse.json({ data: { id: 1 } }, { status: 201 });
      }),
    );

    const response = await api.post("/api/v1/tors", {});

    expect(response.status).toBe(201);
    expect(csrf).toHaveBeenCalledOnce();
    expect(attempts).toBe(2);
  });

  it("gives up after one CSRF retry", async () => {
    let attempts = 0;
    server.use(
      http.get(apiUrl("/sanctum/csrf-cookie"), () => new HttpResponse(null, { status: 204 })),
      http.post(apiUrl("/api/v1/tors"), () => {
        attempts += 1;
        return new HttpResponse(null, { status: 419 });
      }),
    );

    await expect(api.post("/api/v1/tors", {})).rejects.toMatchObject({ response: { status: 419 } });
    expect(attempts).toBe(2);
  });
});
