import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useSaveVendorContact } from "@/lib/vendor/profile/mutations/useSaveVendorContact";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const payload = { contactName: "สมชาย", contactEmail: "a@b.co", isMainContact: true };

describe("useSaveVendorContact", () => {
  it("posts the contact and invalidates the vendor profile", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl("/api/v1/vendor/contact"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useSaveVendorContact());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync(payload));

    expect(body).toEqual(payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendor", "profile"] });
  });

  it("does not invalidate when the save fails", async () => {
    server.use(
      http.post(apiUrl("/api/v1/vendor/contact"), () => HttpResponse.json({ message: "bad" }, { status: 422 })),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useSaveVendorContact());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(payload)).rejects.toThrow();
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
