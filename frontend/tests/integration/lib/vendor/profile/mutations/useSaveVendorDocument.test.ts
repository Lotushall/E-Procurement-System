import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useSaveVendorDocument } from "@/lib/vendor/profile/mutations/useSaveVendorDocument";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

function makePayload() {
  return {
    documentType: "company_certificate",
    file: new File(["%PDF"], "cert.pdf", { type: "application/pdf" }),
  };
}

describe("useSaveVendorDocument", () => {
  it("uploads the file and invalidates the vendor profile", async () => {
    let raw = "";
    server.use(
      http.post(apiUrl("/api/v1/vendor/document"), async ({ request }) => {
        raw = await request.text(); // formData() ใช้ไม่ได้ใน jsdom (File คนละ realm)
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useSaveVendorDocument());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync(makePayload()));

    expect(raw).toContain('name="documentType"\r\n\r\ncompany_certificate');
    expect(raw).toContain('name="file"; filename="cert.pdf"');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendor", "profile"] });
  });

  it("still invalidates the vendor profile when the upload fails (onSettled)", async () => {
    server.use(
      http.post(apiUrl("/api/v1/vendor/document"), () => HttpResponse.json({ message: "bad" }, { status: 422 })),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useSaveVendorDocument());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(makePayload())).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendor", "profile"] });
  });
});
