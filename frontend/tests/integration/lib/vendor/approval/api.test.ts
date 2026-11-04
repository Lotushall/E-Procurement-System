import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import {
  approveVendor,
  approveVendorDocument,
  deleteVendor,
  fetchVendorCount,
  fetchVendorDetail,
  fetchVendorList,
  pendingVendor,
  pendingVendorDocument,
  rejectVendor,
  rejectVendorDocument,
} from "@/lib/vendor/approval/api";
import { makeVendorDetail, makeVendorListItem } from "@/tests/fixtures/vendor-approval";
import { apiUrl, server } from "@/tests/msw/server";

describe("fetchVendorList", () => {
  it("sends filters with page and per_page, and maps snake_case meta", async () => {
    let query: URLSearchParams | undefined;
    const vendor = makeVendorListItem({ id: 5 });
    server.use(
      http.get(apiUrl("/api/v1/vendors"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          data: [vendor],
          meta: {
            counts: { total: 9, pending: 4, approved: 3, rejected: 2 },
            current_page: 2,
            per_page: 50,
            total: 9,
            last_page: 3,
          },
        });
      }),
    );

    const result = await fetchVendorList(
      { status: "pending", search: "บริษัท", sort_by: "name", sort_direction: "asc" },
      2,
      50,
    );

    expect(Object.fromEntries(query!)).toEqual({
      status: "pending",
      search: "บริษัท",
      sort_by: "name",
      sort_direction: "asc",
      page: "2",
      per_page: "50",
    });
    expect(result).toEqual({
      vendors: [vendor],
      counts: { total: 9, pending: 4, approved: 3, rejected: 2 },
      pagination: { currentPage: 2, perPage: 50, total: 9, lastPage: 3 },
    });
  });

  it("defaults to page 1, 20 per page and no filters", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl("/api/v1/vendors"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          data: [],
          meta: {
            counts: { total: 0, pending: 0, approved: 0, rejected: 0 },
            current_page: 1,
            per_page: 20,
            total: 0,
            last_page: 1,
          },
        });
      }),
    );

    await fetchVendorList();

    expect(Object.fromEntries(query!)).toEqual({ page: "1", per_page: "20" });
  });
});

describe("fetchVendorCount", () => {
  it("asks for one row of the given status and returns meta.total", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl("/api/v1/vendors"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ data: [], meta: { total: 12 } });
      }),
    );

    await expect(fetchVendorCount("approved")).resolves.toBe(12);
    expect(Object.fromEntries(query!)).toEqual({ status: "approved", per_page: "1" });
  });
});

describe("fetchVendorDetail", () => {
  it("gets the vendor by id and unwraps data", async () => {
    const detail = makeVendorDetail({ id: 7 });
    server.use(http.get(apiUrl("/api/v1/vendors/7"), () => HttpResponse.json({ data: detail })));

    await expect(fetchVendorDetail(7)).resolves.toEqual(detail);
  });
});

describe("vendor actions", () => {
  function capturePost(path: string) {
    const calls: { body: unknown; text: string }[] = [];
    server.use(
      http.post(apiUrl(path), async ({ request }) => {
        const text = await request.text();
        calls.push({ text, body: text ? JSON.parse(text) : undefined });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    return calls;
  }

  it("approveVendor posts the remark", async () => {
    const calls = capturePost("/api/v1/vendors/3/approve");

    await expect(approveVendor(3, "ผ่านการตรวจสอบ")).resolves.toBeUndefined();

    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({ remark: "ผ่านการตรวจสอบ" });
  });

  it("approveVendor works without a remark", async () => {
    const calls = capturePost("/api/v1/vendors/3/approve");

    await approveVendor(3);

    expect(calls).toHaveLength(1);
    expect(calls[0].body ?? {}).toEqual({});
  });

  it("rejectVendor posts the remark", async () => {
    const calls = capturePost("/api/v1/vendors/3/reject");

    await rejectVendor(3, "เอกสารไม่ครบ");

    expect(calls[0].body).toEqual({ remark: "เอกสารไม่ครบ" });
  });

  it("pendingVendor posts without a body", async () => {
    const calls = capturePost("/api/v1/vendors/3/pending");

    await pendingVendor(3);

    expect(calls).toHaveLength(1);
    expect(calls[0].text).toBe("");
  });

  it("deleteVendor sends DELETE to the vendor", async () => {
    let called = false;
    server.use(
      http.delete(apiUrl("/api/v1/vendors/3"), () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(deleteVendor(3)).resolves.toBeUndefined();
    expect(called).toBe(true);
  });

  it("approveVendorDocument posts to the document approve route", async () => {
    const calls = capturePost("/api/v1/vendors/3/documents/8/approve");

    await approveVendorDocument(3, 8);

    expect(calls).toHaveLength(1);
  });

  it("rejectVendorDocument posts the remark to the document reject route", async () => {
    const calls = capturePost("/api/v1/vendors/3/documents/8/reject");

    await rejectVendorDocument(3, 8, "ภาพไม่ชัด");

    expect(calls[0].body).toEqual({ remark: "ภาพไม่ชัด" });
  });

  it("pendingVendorDocument posts to the document pending route", async () => {
    const calls = capturePost("/api/v1/vendors/3/documents/8/pending");

    await pendingVendorDocument(3, 8);

    expect(calls).toHaveLength(1);
  });

  it("propagates request failures", async () => {
    server.use(
      http.post(apiUrl("/api/v1/vendors/3/approve"), () => HttpResponse.json({ message: "no" }, { status: 403 })),
    );

    await expect(approveVendor(3)).rejects.toMatchObject({ response: { status: 403 } });
  });
});
