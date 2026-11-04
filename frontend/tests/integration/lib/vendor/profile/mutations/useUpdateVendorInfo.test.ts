import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import {
  UPDATE_VENDOR_INFO_MUTATION_KEY,
  useIsVendorInfoSubmitting,
  useUpdateVendorInfo,
} from "@/lib/vendor/profile/mutations/useUpdateVendorInfo";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const payload = {
  vendorType: "company" as const,
  companyName: "บริษัท",
  businessType: "ซื้อขาย",
  address: "1",
  province: "กรุงเทพ",
  postalCode: "10110",
};

describe("useUpdateVendorInfo", () => {
  it("posts the payload and invalidates the vendor profile", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl("/api/v1/vendor/info"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateVendorInfo());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync(payload));

    expect(body).toEqual(payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendor", "profile"] });
  });

  it("does not invalidate when the update fails", async () => {
    server.use(
      http.post(apiUrl("/api/v1/vendor/info"), () => HttpResponse.json({ message: "bad" }, { status: 422 })),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateVendorInfo());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).rejects.toThrow();
    });

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("uses the exported mutation key", () => {
    expect(UPDATE_VENDOR_INFO_MUTATION_KEY).toEqual(["vendor", "info", "update"]);
  });
});

describe("useIsVendorInfoSubmitting", () => {
  it("is true only while a vendor-info save is in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(apiUrl("/api/v1/vendor/info"), async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHookWithQueryClient(() => ({
      mutation: useUpdateVendorInfo(),
      submitting: useIsVendorInfoSubmitting(),
    }));
    expect(result.current.submitting).toBe(false);

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.mutation.mutateAsync(payload);
    });
    await waitFor(() => expect(result.current.submitting).toBe(true));

    release();
    await act(() => pending);

    await waitFor(() => expect(result.current.submitting).toBe(false));
  });
});
