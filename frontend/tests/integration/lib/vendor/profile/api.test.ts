import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import {
  deleteVendorContact,
  deleteVendorDocument,
  fetchVendorProfile,
  getVendorDocumentViewUrl,
  saveVendorContact,
  saveVendorDocument,
  updateVendorInfo,
} from "@/lib/vendor/profile/api";
import { makeCompanyVendorProfile } from "@/tests/fixtures/vendor-profile";
import { apiUrl, server } from "@/tests/msw/server";

describe("fetchVendorProfile", () => {
  it("returns the unwrapped profile and passes masked ids through untouched", async () => {
    const profile = makeCompanyVendorProfile({ detail: { taxId: "0-1055-xxxxx-xx-1" } });
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), () => HttpResponse.json({ data: profile })));

    const result = await fetchVendorProfile();

    expect(result).toEqual(profile);
    expect(result?.detail.taxId).toBe("0-1055-xxxxx-xx-1");
  });

  it("returns null on 404", async () => {
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), () => HttpResponse.json({}, { status: 404 })));
    await expect(fetchVendorProfile()).resolves.toBeNull();
  });

  it("rethrows other HTTP errors", async () => {
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), () => HttpResponse.json({}, { status: 500 })));
    await expect(fetchVendorProfile()).rejects.toThrow();
  });
});

describe("updateVendorInfo", () => {
  it("posts the payload as JSON", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl("/api/v1/vendor/info"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const payload = {
      vendorType: "company" as const,
      companyName: "บริษัท",
      businessType: "ซื้อขาย",
      taxId: "0-1055-xxxxx-xx-1",
      address: "1",
      province: "กรุงเทพ",
      postalCode: "10110",
    };

    await updateVendorInfo(payload);

    expect(body).toEqual(payload);
  });
});

describe("saveVendorContact / deleteVendorContact", () => {
  it("posts the contact payload", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl("/api/v1/vendor/contact"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await saveVendorContact({ id: 3, contactName: "สมชาย", isMainContact: true });

    expect(body).toEqual({ id: 3, contactName: "สมชาย", isMainContact: true });
  });

  it("deletes the contact by id", async () => {
    let path: string | undefined;
    server.use(
      http.delete(apiUrl("/api/v1/vendor/contact/:id"), ({ request }) => {
        path = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await deleteVendorContact(9);

    expect(path).toBe("/api/v1/vendor/contact/9");
  });
});

describe("saveVendorDocument", () => {
  it("uploads multipart form data with documentType and the file", async () => {
    let contentType: string | null = null;
    let raw = "";
    server.use(
      http.post(apiUrl("/api/v1/vendor/document"), async ({ request }) => {
        contentType = request.headers.get("content-type");
        // request.formData() ใช้ไม่ได้ใน jsdom: undici ปฏิเสธ File ของ jsdom จึงอ่านเป็นข้อความแล้วตรวจ part
        raw = await request.text();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const file = new File(["%PDF-1.4"], "cert.pdf", { type: "application/pdf" });

    await saveVendorDocument({ documentType: "company_certificate", file });

    expect(contentType).toMatch(/^multipart\/form-data/);
    expect(raw).toContain('name="documentType"\r\n\r\ncompany_certificate');
    expect(raw).toContain('name="file"; filename="cert.pdf"');
    expect(raw).toContain("Content-Type: application/pdf");
    expect(raw).toContain("%PDF-1.4");
  });

  it("works without an onUploadProgress callback", async () => {
    server.use(http.post(apiUrl("/api/v1/vendor/document"), () => new HttpResponse(null, { status: 204 })));
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });

    await expect(saveVendorDocument({ documentType: "t", file })).resolves.toBeUndefined();
  });

  it("only reports upload progress as a 0-100 percentage when a callback is given", async () => {
    server.use(http.post(apiUrl("/api/v1/vendor/document"), () => new HttpResponse(null, { status: 204 })));
    const file = new File(["x".repeat(2000)], "a.pdf", { type: "application/pdf" });
    const onUploadProgress = vi.fn();

    await saveVendorDocument({ documentType: "t", file, onUploadProgress });

    expect(onUploadProgress).toHaveBeenCalled();
    for (const [percent] of onUploadProgress.mock.calls) {
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
    expect(onUploadProgress.mock.calls.at(-1)![0]).toBe(100);
  });

  it("aborts the upload when the signal is aborted", async () => {
    server.use(http.post(apiUrl("/api/v1/vendor/document"), () => new Promise(() => {})));
    const controller = new AbortController();
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });

    const promise = saveVendorDocument({ documentType: "t", file, signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toThrow();
  });
});

describe("deleteVendorDocument", () => {
  it("deletes the document by id", async () => {
    let path: string | undefined;
    server.use(
      http.delete(apiUrl("/api/v1/vendor/document/:id"), ({ request }) => {
        path = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await deleteVendorDocument(4);

    expect(path).toBe("/api/v1/vendor/document/4");
  });
});

describe("getVendorDocumentViewUrl", () => {
  it("builds the view URL from the API base", () => {
    expect(getVendorDocumentViewUrl(5)).toBe("http://localhost:3000/api/v1/vendor/document/5/view");
  });
});
