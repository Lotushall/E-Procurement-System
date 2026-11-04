import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { TenderProjectCard } from "@/app/dashboard/tender-projects/_components/table/tender-project-card";
import type { TenderProjects } from "@/lib/tender/tender-projects/types";
import { makeDepartment, makeInternalProfile } from "@/tests/fixtures/internal-profiles";
import { makeTenderProject } from "@/tests/fixtures/tender-projects";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { apiUrl, server } from "@/tests/msw/server";

freezeTimeAt("2026-11-02T10:00:00+07:00");

function setup(
  project: Partial<TenderProjects> = {},
  canUpdateStatus = false,
  { canUpdate = true, canDelete = true, isAdmin = false } = {},
) {
  server.use(http.get(apiUrl("/api/v1/dashboard/departments/select"), () => HttpResponse.json({ data: [makeDepartment()] })));
  renderWithQueryClient(
    <TenderProjectCard
      project={makeTenderProject(project)}
      canUpdateStatus={canUpdateStatus}
      canUpdate={canUpdate}
      canDelete={canDelete}
      isAdmin={isAdmin}
    />,
  );
  return { user: userEvent.setup(), card: screen.getByRole("article") };
}

describe("TenderProjectCard — content", () => {
  it("links the code, name and department to the detail page", () => {
    const { card } = setup({ id: 42, projectCode: "TP-2569-042", name: "จัดซื้อโต๊ะ", department: { id: 3, name: "บัญชี" } });

    const link = within(card).getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard/tender-projects/detail?id=42");
    expect(link).toHaveTextContent("TP-2569-042");
    expect(link).toHaveTextContent("จัดซื้อโต๊ะ");
    expect(link).toHaveTextContent("บัญชี");
  });

  it("shows a dash when the department was not loaded", () => {
    const { card } = setup({ name: "โครงการ ก", department: undefined });

    expect(within(card).getByRole("link")).toHaveTextContent("โครงการ ก-");
  });

  it("shows the fiscal year and the budget with a baht sign", () => {
    const { card } = setup({ fiscalYear: 2570, budget: "1250000.00" });

    expect(card).toHaveTextContent("งบประมาณ ปี 2570");
    expect(card).toHaveTextContent("฿1,250,000");
  });

  it("keeps the satang of the budget", () => {
    const { card } = setup({ budget: "500000.55" });

    expect(card).toHaveTextContent("฿500,000.55");
  });

  it("shows the allocation bar with what is left", () => {
    const { card } = setup({ budget: "1000000.00", allocatedBudget: "250000.00" });

    expect(within(card).getByRole("img", { name: "จัดสรร 25% ของงบประมาณ" })).toBeInTheDocument();
    expect(card).toHaveTextContent("เหลือ ฿750,000");
  });

  it("highlights the card and warns when the allocation exceeds the budget", () => {
    const { card } = setup({ budget: "1000000.00", allocatedBudget: "1200000.00" });

    expect(card).toHaveTextContent("จัดสรรเกินงบ 120%");
    expect(card).toHaveTextContent("เกิน ฿200,000");
    expect(card).toHaveClass("border-red-200");
  });

  it("does not highlight a card within budget", () => {
    const { card } = setup({ budget: "1000000.00", allocatedBudget: "1000000.00" });

    expect(card).not.toHaveClass("border-red-200");
  });

  it.each([
    [0, "ยังไม่มี TOR"],
    [1, "1 TOR"],
    [12, "12 TOR"],
  ])("shows %i TORs as %s", (torsCount, text) => {
    const { card } = setup({ torsCount });

    expect(card).toHaveTextContent(text);
  });

  it("hides the TOR count when it was not sent", () => {
    const { card } = setup({ torsCount: undefined });

    expect(card).not.toHaveTextContent("TOR");
  });

  it("shows the person in charge", () => {
    const { card } = setup({ personInCharge: makeInternalProfile({ firstname: "สมหญิง", lastname: "รักดี" }) });

    expect(card).toHaveTextContent("ผู้รับผิดชอบสมหญิง รักดี");
  });

  it.each([
    ["missing", undefined],
    ["null", null],
  ])("says there is no person in charge when it is %s", (_name, personInCharge) => {
    const { card } = setup({ personInCharge });

    expect(card).toHaveTextContent("ยังไม่มีผู้รับผิดชอบ");
  });

  it("shows the project period with the time left", () => {
    const { card } = setup({
      status: "published",
      projectStartAt: "2026-01-05T00:00:00.000000Z",
      projectEndAt: "2026-11-20T00:00:00.000000Z",
    });

    expect(card).toHaveTextContent("5 ม.ค. 26 – 20 พ.ย. 26");
    expect(card).toHaveTextContent("เหลือ 18 วัน");
  });

  it("says the period is not set", () => {
    const { card } = setup({ projectStartAt: undefined, projectEndAt: undefined });

    expect(card).toHaveTextContent("ยังไม่กำหนดระยะเวลา");
  });
});

describe("TenderProjectCard — status", () => {
  it("shows a read-only badge without the update-status permission", () => {
    const { card } = setup({ status: "closed" }, false);

    expect(card).toHaveTextContent("ปิดรับซอง");
    expect(within(card).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows the status select with the update-status permission and patches this project", async () => {
    // status select อ่าน role ของผู้ใช้ — draft → published เป็นขั้นถัดไปที่ทำได้แม้ไม่ใช่ admin
    signInAs({ roles: ["officer"] });
    const patched: unknown[] = [];
    const { user, card } = setup({ id: 9, status: "draft" }, true);
    server.use(
      http.patch(apiUrl("/api/v1/dashboard/tender-projects/:id/status"), async ({ params, request }) => {
        patched.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ data: makeTenderProject({ id: 9, status: "published" }) });
      }),
    );

    await user.click(within(card).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "กำลังดำเนินการ" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เปลี่ยนสถานะสำเร็จ"));
    expect(patched).toEqual([{ id: "9", body: { status: "published" } }]);
  });
});

describe("TenderProjectCard — menu", () => {
  it("opens the edit dialog seeded with the project from the menu", async () => {
    // dialog โหลดรายชื่อผู้รับผิดชอบเมื่อเปิด
    server.use(http.get(apiUrl("/api/v1/dashboard/internal-profiles/select"), () => HttpResponse.json({ data: [] })));
    const { user, card } = setup({ name: "จัดซื้อเก้าอี้" });

    await user.click(within(card).getByRole("button", { name: "ตัวเลือกของโครงการ" }));
    await user.click(await screen.findByRole("menuitem", { name: "แก้ไข" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("แก้ไขโครงการจัดซื้อจัดจ้าง")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("จัดซื้อเก้าอี้")).toBeInTheDocument();
  });

  it("opens the delete confirmation from the menu and deletes this project", async () => {
    const deleted: unknown[] = [];
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/tender-projects/:id"), ({ params }) => {
        deleted.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, card } = setup({ id: 5, name: "จัดซื้อเก้าอี้" });

    await user.click(within(card).getByRole("button", { name: "ตัวเลือกของโครงการ" }));
    await user.click(await screen.findByRole("menuitem", { name: "ลบ" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent('ต้องการลบโครงการ "จัดซื้อเก้าอี้" ใช่หรือไม่?');
    await user.click(within(dialog).getByRole("button", { name: "ลบโครงการ" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบโครงการสำเร็จ"));
    expect(deleted).toEqual(["5"]);
  });

  it("hides the menu when the user can neither update nor delete", () => {
    const { card } = setup({}, false, { canUpdate: false, canDelete: false });

    expect(within(card).queryByRole("button", { name: "ตัวเลือกของโครงการ" })).not.toBeInTheDocument();
  });

  it("offers only edit when the user cannot delete", async () => {
    const { user, card } = setup({}, false, { canDelete: false });

    await user.click(within(card).getByRole("button", { name: "ตัวเลือกของโครงการ" }));

    expect(await screen.findByRole("menuitem", { name: "แก้ไข" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "ลบ" })).not.toBeInTheDocument();
  });

  it("offers only delete when the user cannot update", async () => {
    const { user, card } = setup({}, false, { canUpdate: false });

    await user.click(within(card).getByRole("button", { name: "ตัวเลือกของโครงการ" }));

    expect(await screen.findByRole("menuitem", { name: "ลบ" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "แก้ไข" })).not.toBeInTheDocument();
  });

  it.each(["completed", "cancelled", "archived"] as const)(
    "hides the menu on a %s project from a non-admin",
    (status) => {
      const { card } = setup({ status });

      expect(within(card).queryByRole("button", { name: "ตัวเลือกของโครงการ" })).not.toBeInTheDocument();
    },
  );

  it("still offers edit and delete on a finished project to an admin", async () => {
    const { user, card } = setup({ status: "archived" }, false, { isAdmin: true });

    await user.click(within(card).getByRole("button", { name: "ตัวเลือกของโครงการ" }));

    expect(await screen.findByRole("menuitem", { name: "แก้ไข" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "ลบ" })).toBeInTheDocument();
  });
});
