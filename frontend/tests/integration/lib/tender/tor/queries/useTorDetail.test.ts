import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useTorDetail } from "@/lib/tender/tor/queries/useTorDetail";
import { makeTor } from "@/tests/fixtures/tors";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tors/:id");

describe("useTorDetail", () => {
  it("loads the TOR for the id and caches it under the detail key", async () => {
    const tor = makeTor({ id: 12 });
    const requested = vi.fn();
    server.use(
      http.get(URL_, ({ params }) => {
        requested(params.id);
        return HttpResponse.json({ data: tor });
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useTorDetail(12));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(tor);
    expect(requested).toHaveBeenCalledExactlyOnceWith("12");
    expect(queryClient.getQueryData(["tors", "detail", 12])).toEqual(tor);
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("makes no request when the id is %s", (_name, id) => {
    const requested = vi.fn();
    server.use(
      http.get(URL_, () => {
        requested();
        return HttpResponse.json({ data: makeTor() });
      }),
    );

    const { result } = renderHookWithQueryClient(() => useTorDetail(id));

    expect(result.current.fetchStatus).toBe("idle");
    expect(requested).not.toHaveBeenCalled();
  });

  it("reports an error on a 404", async () => {
    server.use(http.get(URL_, () => new HttpResponse(null, { status: 404 })));

    const { result } = renderHookWithQueryClient(() => useTorDetail(99));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
