import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useVerifyEmail } from "@/lib/auth/mutations/useVerifyEmail";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const params = { id: "7", hash: "h", expires: "1700000000", signature: "sig" };

describe("useVerifyEmail", () => {
  it("requests the verify url with the signed query", async () => {
    let url: URL | undefined;
    server.use(
      http.get(apiUrl("/api/v1/auth/email/verify/7/h"), ({ request }) => {
        url = new URL(request.url);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useVerifyEmail());

    await act(() => result.current.mutateAsync(params));

    expect(Object.fromEntries(url!.searchParams)).toEqual({ expires: "1700000000", signature: "sig" });
  });

  it("propagates the error when the link is invalid", async () => {
    server.use(
      http.get(apiUrl("/api/v1/auth/email/verify/7/h"), () => new HttpResponse(null, { status: 403 })),
    );
    const { result } = renderHookWithQueryClient(() => useVerifyEmail());

    await act(async () => {
      await expect(result.current.mutateAsync(params)).rejects.toThrow();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
