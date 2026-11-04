import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import PositionTab from "@/app/dashboard/internal-employees/departments-positions/_components/position-tab";
import type { Position } from "@/lib/internal-profiles/types";
import { makePosition } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/positions");
const PLACEHOLDER = "ค้นหาตำแหน่ง";

const DEPARTMENTS = [
  makePosition({ id: 1, name: "ผู้จัดการ", internalProfilesCount: 12 }),
  makePosition({ id: 2, name: "วิศวกรและช่าง", internalProfilesCount: 0 }),
  makePosition({ id: 3, name: "IT Support", internalProfilesCount: 3 }),
];

function serveList(positions: Position[]) {
  let calls = 0;
  server.use(
    http.get(LIST_URL, () => {
      calls += 1;
      return HttpResponse.json({ data: positions });
    }),
  );
  return () => calls;
}

function renderTab() {
  const rendered = renderWithQueryClient(<PositionTab />);
  return { ...rendered, user: userEvent.setup() };
}

const search = () => screen.getByPlaceholderText(PLACEHOLDER);
const dataRows = () => screen.getAllByRole("row").slice(1);

describe("PositionTab — loading", () => {
  it("shows the skeleton table and no search box while the list is pending", () => {
    server.use(http.get(LIST_URL, () => new Promise(() => {})));

    const { container } = renderTab();

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีตำแหน่งในระบบ")).not.toBeInTheDocument();
    expect(screen.queryByText("ชื่อตำแหน่ง")).not.toBeInTheDocument();
  });
});

describe("PositionTab — error", () => {
  it.each([500, 404])("shows the load-error text on a %s and keeps the search box", async (status) => {
    server.use(http.get(LIST_URL, () => new HttpResponse(null, { status })));

    const { container } = renderTab();

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูลตำแหน่งได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();
    expect(search()).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีตำแหน่งในระบบ")).not.toBeInTheDocument();
  });
});

describe("PositionTab — empty", () => {
  it("says there are no positions when the list is empty", async () => {
    serveList([]);

    renderTab();

    expect(await screen.findByText("ยังไม่มีตำแหน่งในระบบ")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says nothing matches when a search finds no position", async () => {
    serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.type(search(), "ไม่มีตำแหน่งนี้");

    expect(await screen.findByText("ไม่พบตำแหน่งที่ตรงกับคำค้นหา")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีตำแหน่งในระบบ")).not.toBeInTheDocument();
  });
});

describe("PositionTab — populated", () => {
  it("lists every position with its headcount and row actions", async () => {
    serveList(DEPARTMENTS);

    renderTab();

    await screen.findByPlaceholderText(PLACEHOLDER);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "ชื่อตำแหน่ง" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "จำนวนพนักงาน" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();

    const rows = dataRows();
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("ผู้จัดการ")).toBeInTheDocument();
    expect(within(rows[0]).getByText("12 คน")).toBeInTheDocument();
    expect(within(rows[1]).getByText("วิศวกรและช่าง")).toBeInTheDocument();
    expect(within(rows[1]).getByText("0 คน")).toBeInTheDocument();
    expect(within(rows[2]).getByText("IT Support")).toBeInTheDocument();
    expect(within(rows[2]).getByText("3 คน")).toBeInTheDocument();
    for (const row of rows) {
      expect(within(row).getByRole("button", { name: "แก้ไขตำแหน่ง" })).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: "ลบตำแหน่ง" })).toBeInTheDocument();
    }
  });

  it("shows 0 คน when the backend omits the headcount", async () => {
    serveList([{ id: 9, name: "ใหม่" } as Position]);

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

describe("PositionTab — search", () => {
  it("filters rows by name ignoring case, without another request", async () => {
    const calls = serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.type(search(), "it sup");

    await screen.findByText("IT Support");
    expect(dataRows()).toHaveLength(1);
    expect(screen.queryByText("ผู้จัดการ")).not.toBeInTheDocument();
    expect(calls()).toBe(1);
  });

  it("matches a substring of a Thai name", async () => {
    serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.type(search(), "ช่าง");

    await screen.findByText("วิศวกรและช่าง");
    expect(dataRows()).toHaveLength(1);
  });

  it("ignores surrounding whitespace in the query", async () => {
    serveList(DEPARTMENTS);
    const { user } = renderTab();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.type(search(), "  ผู้จัดการ  ");

    await screen.findByText("ผู้จัดการ");
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
    await user.type(search(), "ผู้จัดการ");
    await screen.findByText("ผู้จัดการ");
    expect(dataRows()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));

    expect(await screen.findByText("วิศวกรและช่าง")).toBeInTheDocument();
    expect(dataRows()).toHaveLength(3);
    expect(search()).toHaveValue("");
  });
});
