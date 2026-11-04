import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { OverviewTab } from "@/app/dashboard/users/detail/_components/overview-tab";
import type { UserDetail } from "@/lib/user/management/types";
import { makeInternalProfileFields, makeUserDetail } from "@/tests/fixtures/user-management";
import { freezeTimeAt } from "@/tests/helpers/time";
import { renderWithQueryClient } from "@/tests/helpers/query-client";

freezeTimeAt("2026-11-02T10:00:00+07:00");

const INTERNAL = makeUserDetail({
  id: 7,
  username: "somchai",
  email: "somchai@example.com",
  createdAt: "2026-01-15T03:00:00.000000Z",
  emailVerifiedAt: "2026-01-15T03:00:00.000000Z",
  lastLoginAt: "2026-11-02T00:00:00.000000Z", // 3 ชั่วโมงก่อนเวลาที่ล็อกไว้
  passwordChangedAt: "2026-11-01T03:00:00.000000Z", // 1 วันก่อน
});

function renderTab(user: UserDetail = INTERNAL) {
  return renderWithQueryClient(<OverviewTab user={user} status={user.status} />);
}

// InfoRow ไม่มี role — หา span ค่าจาก label ในแถวเดียวกัน
function row(label: string, scope: HTMLElement = document.body): HTMLElement {
  const labelNode = within(scope).getByText(label);
  return labelNode.parentElement as HTMLElement;
}

function card(title: string): HTMLElement {
  return screen.getByText(title).closest("[data-slot='card']") as HTMLElement;
}

describe("OverviewTab — account card", () => {
  it("shows username, email, user type, status and created date", () => {
    renderTab();
    const account = card("ข้อมูลบัญชี");

    expect(row("Username", account)).toHaveTextContent("somchai");
    expect(row("อีเมล", account)).toHaveTextContent("somchai@example.com");
    expect(row("ประเภทผู้ใช้", account)).toHaveTextContent("พนักงานภายใน");
    expect(row("สถานะ", account)).toHaveTextContent("active");
    expect(row("วันที่สร้างบัญชี", account)).toHaveTextContent("15-01-2026");
  });

  it.each([
    ["company", "นิติบุคคล"],
    ["individual", "ร้านค้า"],
  ] as const)("labels a %s user as %s", (userType, label) => {
    renderTab(makeUserDetail({ userType, vendorProfileId: 3, role: null, internalProfile: null }));

    expect(row("ประเภทผู้ใช้", card("ข้อมูลบัญชี"))).toHaveTextContent(label);
  });

  it("shows the verified badge when the email is verified", () => {
    renderTab();

    expect(within(card("ข้อมูลบัญชี")).getByText("ยืนยันแล้ว")).toBeInTheDocument();
    expect(within(card("ความปลอดภัย")).getByText("ยืนยันแล้ว")).toBeInTheDocument();
    expect(screen.queryByText("ยังไม่ยืนยัน")).not.toBeInTheDocument();
  });

  it("shows the unverified badge when emailVerifiedAt is null", () => {
    renderTab(makeUserDetail({ emailVerifiedAt: null }));

    expect(within(card("ข้อมูลบัญชี")).getByText("ยังไม่ยืนยัน")).toBeInTheDocument();
    expect(within(card("ความปลอดภัย")).getByText("ยังไม่ยืนยัน")).toBeInTheDocument();
    expect(screen.queryByText("ยืนยันแล้ว")).not.toBeInTheDocument();
  });

  it("shows a dash for an unparseable created date", () => {
    renderTab(makeUserDetail({ createdAt: "not-a-date" }));

    expect(row("วันที่สร้างบัญชี")).toHaveTextContent(/^วันที่สร้างบัญชี-$/);
  });
});

describe("OverviewTab — personal info card", () => {
  it("shows the internal profile fields", () => {
    renderTab();
    const personal = card("ข้อมูลส่วนตัว");

    expect(row("รหัสพนักงาน", personal)).toHaveTextContent("EMP-001");
    expect(row("ชื่อ-นามสกุล", personal)).toHaveTextContent("นายสมชาย ใจดี");
    expect(row("แผนก", personal)).toHaveTextContent("จัดซื้อ");
    expect(row("ตำแหน่ง", personal)).toHaveTextContent("เจ้าหน้าที่จัดซื้อ");
    expect(row("เบอร์โทร", personal)).toHaveTextContent("081-234-5678");
  });

  it("shows dashes for null profile fields and omits a null prefix", () => {
    renderTab(
      makeUserDetail({
        internalProfile: makeInternalProfileFields({
          prefix: null,
          employeeNo: null,
          department: null,
          position: null,
          phone: null,
        }),
      }),
    );
    const personal = card("ข้อมูลส่วนตัว");

    expect(row("รหัสพนักงาน", personal)).toHaveTextContent(/^รหัสพนักงาน-$/);
    expect(row("ชื่อ-นามสกุล", personal)).toHaveTextContent("สมชาย ใจดี");
    expect(row("ชื่อ-นามสกุล", personal)).not.toHaveTextContent("นาย");
    expect(row("แผนก", personal)).toHaveTextContent(/^แผนก-$/);
    expect(row("ตำแหน่ง", personal)).toHaveTextContent(/^ตำแหน่ง-$/);
    expect(row("เบอร์โทร", personal)).toHaveTextContent(/^เบอร์โทร-$/);
  });

  it("shows the empty note for a vendor user", () => {
    renderTab(makeUserDetail({ userType: "company", vendorProfileId: 3, role: null, internalProfile: null }));

    expect(within(card("ข้อมูลส่วนตัว")).getByText("ไม่มีข้อมูลส่วนตัวเพิ่มเติมสำหรับผู้ใช้ประเภทนี้")).toBeInTheDocument();
    expect(screen.queryByText("รหัสพนักงาน")).not.toBeInTheDocument();
  });

  it("shows the empty note for an internal user without a profile", () => {
    renderTab(makeUserDetail({ internalProfile: null }));

    expect(screen.getByText("ไม่มีข้อมูลส่วนตัวเพิ่มเติมสำหรับผู้ใช้ประเภทนี้")).toBeInTheDocument();
  });
});

describe("OverviewTab — security card", () => {
  it("shows relative last-login and password-change times", () => {
    renderTab();
    const security = card("ความปลอดภัย");

    expect(row("เข้าสู่ระบบล่าสุด", security)).toHaveTextContent("ประมาณ 3 ชั่วโมงที่ผ่านมา");
    expect(row("เปลี่ยนรหัสผ่านล่าสุด", security)).toHaveTextContent("1 วันที่ผ่านมา");
  });

  it("shows the absolute last-login date in a tooltip on hover", async () => {
    const actor = userEvent.setup();
    renderTab();

    expect(screen.queryByText("02-11-2026")).not.toBeInTheDocument();
    await actor.hover(screen.getByText("ประมาณ 3 ชั่วโมงที่ผ่านมา"));

    expect(await screen.findByText("02-11-2026")).toBeInTheDocument();
  });

  it("shows fallbacks when the user never logged in or changed the password", () => {
    renderTab(makeUserDetail({ lastLoginAt: null, passwordChangedAt: null }));
    const security = card("ความปลอดภัย");

    expect(row("เข้าสู่ระบบล่าสุด", security)).toHaveTextContent("ยังไม่เคยเข้าสู่ระบบ");
    expect(row("เปลี่ยนรหัสผ่านล่าสุด", security)).toHaveTextContent("ยังไม่เคยเปลี่ยนรหัสผ่าน");
  });
});
