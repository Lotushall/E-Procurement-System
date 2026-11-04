import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useVendorProfile } from "@/lib/vendor/profile/queries/useVendorProfile";
import { makeCompanyVendorProfile } from "@/tests/fixtures/vendor-profile";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useVendorProfile", () => {
  it("fetches the profile under the vendor/profile key", async () => {
    const profile = makeCompanyVendorProfile();
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), () => HttpResponse.json({ data: profile })));

    const { result, queryClient } = renderHookWithQueryClient(() => useVendorProfile());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(profile);
    expect(queryClient.getQueryData(["vendor", "profile"])).toEqual(profile);
  });

  it("resolves to null when the vendor has no profile (404)", async () => {
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), () => HttpResponse.json({}, { status: 404 })));

    const { result } = renderHookWithQueryClient(() => useVendorProfile());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("surfaces other failures as an error", async () => {
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), () => HttpResponse.json({}, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useVendorProfile());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("makes no request when disabled", () => {
    const spy = vi.fn(() => HttpResponse.json({ data: makeCompanyVendorProfile() }));
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), spy));

    const { result } = renderHookWithQueryClient(() => useVendorProfile(false));

    expect(result.current.fetchStatus).toBe("idle");
    expect(spy).not.toHaveBeenCalled();
  });
});
