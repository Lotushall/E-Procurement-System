import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { fetchTorDetail, fetchTorsList } from "@/lib/tender/tor/api";
import { paginated } from "@/tests/fixtures/pagination";
import { makeTor } from "@/tests/fixtures/tors";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/tors");
const DETAIL_URL = apiUrl("/api/v1/dashboard/tors/:id");

function captureQuery() {
  const captured: { query?: URLSearchParams } = {};
  server.use(
    http.get(LIST_URL, ({ request }) => {
      captured.query = new URL(request.url).searchParams;
      return HttpResponse.json(paginated([]));
    }),
  );
  return captured;
}

describe("fetchTorsList", () => {
  it("defaults to page 1 of 20 with no filters and returns the rows untouched", async () => {
    const rows = [makeTor({ id: 1 }), makeTor({ id: 2, torCode: "TOR-2569-002" })];
    let query: URLSearchParams | undefined;
    server.use(
      http.get(LIST_URL, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated(rows));
      }),
    );

    const result = await fetchTorsList();

    expect(Object.fromEntries(query!)).toEqual({ page: "1", per_page: "20" });
    expect(result.data).toEqual(rows);
  });

  it("sends every filter with the page and page size", async () => {
    const captured = captureQuery();

    await fetchTorsList(
      {
        search: "คอม",
        status: "approved",
        department_id: 3,
        fiscal_year: 2569,
        tender_project_id: 7,
        procurement_method: "คัดเลือก",
        sort_by: "budget_estimate",
        sort_direction: "asc",
      },
      3,
      50,
    );

    expect(Object.fromEntries(captured.query!)).toEqual({
      search: "คอม",
      status: "approved",
      department_id: "3",
      fiscal_year: "2569",
      tender_project_id: "7",
      procurement_method: "คัดเลือก",
      sort_by: "budget_estimate",
      sort_direction: "asc",
      page: "3",
      per_page: "50",
    });
  });

  it("sends tender_project_id=none for TORs outside any project", async () => {
    const captured = captureQuery();

    await fetchTorsList({ tender_project_id: "none" });

    expect(captured.query!.get("tender_project_id")).toBe("none");
  });

  it("omits params that are undefined", async () => {
    const captured = captureQuery();

    await fetchTorsList({ search: undefined, status: undefined, department_id: undefined });

    expect(Object.fromEntries(captured.query!)).toEqual({ page: "1", per_page: "20" });
  });

  it("maps only the four pagination meta fields", async () => {
    server.use(
      http.get(LIST_URL, () =>
        HttpResponse.json(paginated([], { currentPage: 2, lastPage: 5, perPage: 10, total: 48, from: 11, to: 20 })),
      ),
    );

    const result = await fetchTorsList({}, 2, 10);

    expect(result.meta).toEqual({ currentPage: 2, lastPage: 5, perPage: 10, total: 48 });
  });

  it("rejects when the server fails", async () => {
    server.use(http.get(LIST_URL, () => HttpResponse.json({ message: "x" }, { status: 500 })));

    await expect(fetchTorsList()).rejects.toMatchObject({ response: { status: 500 } });
  });
});

describe("fetchTorDetail", () => {
  it("requests the TOR by id and unwraps data", async () => {
    const tor = makeTor({ id: 12, title: "จัดซื้อโต๊ะ" });
    let requestedId: string | readonly string[] | undefined;
    server.use(
      http.get(DETAIL_URL, ({ params }) => {
        requestedId = params.id;
        return HttpResponse.json({ data: tor });
      }),
    );

    await expect(fetchTorDetail(12)).resolves.toEqual(tor);
    expect(requestedId).toBe("12");
  });

  it("rejects on a 404", async () => {
    server.use(http.get(DETAIL_URL, () => HttpResponse.json({ message: "ไม่พบ" }, { status: 404 })));

    await expect(fetchTorDetail(99)).rejects.toMatchObject({ response: { status: 404 } });
  });
});
