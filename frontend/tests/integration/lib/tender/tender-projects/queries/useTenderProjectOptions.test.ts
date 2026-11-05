import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useTenderProjectOptions } from "@/lib/tender/tender-projects/queries/useTenderProjectOptions";
import { makeTenderProjectOption } from "@/tests/fixtures/tender-projects";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tender-projects/select");

describe("useTenderProjectOptions", () => {
  it("loads the options and caches them under a key inside the tenders_projects family", async () => {
    const options = [makeTenderProjectOption({ id: 1 }), makeTenderProjectOption({ id: 2, name: "อีกโครงการ" })];
    server.use(http.get(URL_, () => HttpResponse.json({ data: options })));

    const { result, queryClient } = renderHookWithQueryClient(() => useTenderProjectOptions());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(options);
    expect(queryClient.getQueryData(["tenders_projects", "select", {}])).toEqual(options);
  });

  it("caches each filter under its own key", async () => {
    const options = [makeTenderProjectOption({ id: 5 })];
    server.use(http.get(URL_, () => HttpResponse.json({ data: options })));
    const params = { department_id: 3, open_for_tor: true };

    const { result, queryClient } = renderHookWithQueryClient(() => useTenderProjectOptions(params));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(["tenders_projects", "select", params])).toEqual(options);
  });

  it("does not fetch while disabled", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls += 1;
        return HttpResponse.json({ data: [] });
      }),
    );

    const { result } = renderHookWithQueryClient(() => useTenderProjectOptions({}, { enabled: false }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toBe(0);
  });

  it("is refetched when the tenders_projects family is invalidated", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls += 1;
        return HttpResponse.json({ data: [] });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useTenderProjectOptions());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({ queryKey: ["tenders_projects"] });

    await waitFor(() => expect(calls).toBe(2));
  });

  it("reports an error when the request fails", async () => {
    server.use(http.get(URL_, () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useTenderProjectOptions());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
