import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import DepartmentTab from "@/app/dashboard/internal-employees/departments-positions/_components/department-tab";
import type { Department } from "@/lib/internal-profiles/types";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/departments");
const PLACEHOLDER = "ค้นหาแผนก";

const DEPARTMENTS = [
  makeDepartment({ id: 1, name: "จัดซื้อ", internalProfilesCount: 12 }),
  makeDepartment({ id: 2, name: "บัญชีและการเงิน", internalProfilesCount: 0 }),
  makeDepartment({ id: 3, name: "IT Support", internalProfilesCount: 3 }),
];

function serveList(departments: Department[]) {
  let calls = 0;
  server.use(
    http.get(LIST_URL, () => {
      calls += 1;
      return HttpResponse.json({ data: departments });
    }),
  );
  return () => calls;
}

function renderTab() {
  const rendered = renderWithQueryClient(<DepartmentTab />);
  return { ...rendered, user: userEvent.setup() };
}

const search = () => screen.getByPlaceholderText(PLACEHOLDER);
const dataRows = () => screen.getAllByRole("row").slice(1);

describe("DepartmentTab — loading", () => {
  it("shows the skeleton table and no search box while the list is pending", () => {
    server.use(http.get(LIST_URL, () => new Promise(() => {})));

    const { container } = renderTab();

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีแผนกในระบบ")).not.toBeInTheDocument();
    expect(screen.queryByText("ชื่อแผนก")).not.toBeInTheDocument();
  });
});

describe("DepartmentTab — error", () => {
  it.each([500, 404])("shows the load-error text on a %s and keeps the search box", async (status) => {
    server.use(http.get(LIST_URL, () => new HttpResponse(null, { status })));

    const { container } = renderTab();

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูลแผนกได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();
    expect(search()).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีแผนกในระบบ")).not.toBeInTheDocument();
  });
});

describe("DepartmentTab — empty", () => {
  it("says there are no departments when the list is empty", async () => {
    serveList([]);

    renderTab();

    expect(await screen.findByText("ยังไม่มีแผนกในระบบ")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says nothing matches when a search finds no department", async () => {
    serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.type(search(), "ไม่มีแผนกนี้");

    expect(await screen.findByText("ไม่พบแผนกที่ตรงกับคำค้นหา")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีแผนกในระบบ")).not.toBeInTheDocument();
  });
});

describe("DepartmentTab — populated", () => {
  it("lists every department with its headcount and row actions", async () => {
    serveList(DEPARTMENTS);

    renderTab();

    await screen.findByPlaceholderText(PLACEHOLDER);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "ชื่อแผนก" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "จำนวนพนักงาน" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();

    const rows = dataRows();
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("จัดซื้อ")).toBeInTheDocument();
    expect(within(rows[0]).getByText("12 คน")).toBeInTheDocument();
    expect(within(rows[1]).getByText("บัญชีและการเงิน")).toBeInTheDocument();
    expect(within(rows[1]).getByText("0 คน")).toBeInTheDocument();
    expect(within(rows[2]).getByText("IT Support")).toBeInTheDocument();
    expect(within(rows[2]).getByText("3 คน")).toBeInTheDocument();
    for (const row of rows) {
      expect(within(row).getByRole("button", { name: "แก้ไขแผนก" })).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: "ลบแผนก" })).toBeInTheDocument();
    }
  });

  it("shows 0 คน when the backend omits the headcount", async () => {
    serveList([{ id: 9, name: "ใหม่" } as Department]);

    renderTab();

    expect(await screen.findByText("0 คน")).toBeInTheDocument();
  });

  it("fetches the list once", async () => {
    const calls = serveList(DEPARTMENTS);

    renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(calls()).toBe(1);
  });
});

describe("DepartmentTab — search", () => {
  it("filters rows by name ignoring case, without another request", async () => {
    const calls = serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.type(search(), "it sup");

    await screen.findByText("IT Support");
    expect(dataRows()).toHaveLength(1);
    expect(screen.queryByText("จัดซื้อ")).not.toBeInTheDocument();
    expect(calls()).toBe(1);
  });

  it("matches a substring of a Thai name", async () => {
    serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.type(search(), "การเงิน");

    await screen.findByText("บัญชีและการเงิน");
    expect(dataRows()).toHaveLength(1);
  });

  it("ignores surrounding whitespace in the query", async () => {
    serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.type(search(), "  จัดซื้อ  ");

    await screen.findByText("จัดซื้อ");
    expect(dataRows()).toHaveLength(1);
  });

  it("treats a whitespace-only query as no filter", async () => {
    serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.type(search(), "   ");

    expect(dataRows()).toHaveLength(3);
  });

  it("restores the full list when the search is cleared", async () => {
    serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);
    await user.type(search(), "จัดซื้อ");
    await screen.findByText("จัดซื้อ");
    expect(dataRows()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));

    expect(await screen.findByText("บัญชีและการเงิน")).toBeInTheDocument();
    expect(dataRows()).toHaveLength(3);
    expect(search()).toHaveValue("");
  });
});
