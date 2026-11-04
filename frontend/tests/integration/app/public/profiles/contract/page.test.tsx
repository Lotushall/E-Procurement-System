import { act, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import Contract from "@/app/(public)/profiles/contract/page";
import { makeCompanyVendorProfile, makeVendorContact } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const PROFILE_URL = apiUrl("/api/v1/vendor/profile");

// แบ็กเอนด์ส่ง is_main_contact เป็น boolean แม้ type ใน types.ts จะเป็น string
// types.ts:51 declares isMainContact: string, แต่แบ็กเอนด์ส่ง boolean (types.ts:83 ใช้ boolean) — cast จนกว่าจะแก้ type
const notMain = false as unknown as string;

function serveProfile(contacts: ReturnType<typeof makeVendorContact>[]) {
  server.use(
    http.get(PROFILE_URL, () => HttpResponse.json({ data: makeCompanyVendorProfile({ contact: contacts }) })),
  );
}

// ลำดับของการ์ดผู้ติดต่อ: ดึงจากปุ่มแก้ไขของแต่ละการ์ด
function cards() {
  return screen
    .getAllByRole("button", { name: "แก้ไขผู้ติดต่อ" })
    .map((button) => button.closest("div.border") as HTMLElement);
}

describe("Contract page", () => {
  it("shows the heading, the add button and a spinner while loading", () => {
    server.use(http.get(PROFILE_URL, () => new Promise(() => {})));

    renderWithQueryClient(<Contract />);

    expect(screen.getByRole("heading", { name: "ผู้ติดต่อ" })).toBeInTheDocument();
    expect(screen.getByText("บุคคลที่ Lotushall Mining สามารถติดต่อได้เกี่ยวกับการจัดซื้อจัดจ้าง")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เพิ่มผู้ติดต่อ" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "แก้ไขผู้ติดต่อ" })).not.toBeInTheDocument();
  });

  it("lists contacts with name, position, formatted phone, email, LINE and other channel", async () => {
    serveProfile([
      makeVendorContact({
        id: 1,
        contactName: "สมชาย ใจดี",
        contactPosition: "ผู้จัดการ",
        contactPhone: "0812345678",
        contactEmail: "somchai@example.com",
        lineId: "somchai",
        otherContact: "แฟกซ์ 02-111-2222",
      }),
    ]);

    renderWithQueryClient(<Contract />);

    const [card] = await waitForCards();
    expect(within(card).getByText("สมชาย ใจดี")).toBeInTheDocument();
    expect(within(card).getByText("สใ")).toBeInTheDocument();
    expect(within(card).getByText("ผู้จัดการ")).toBeInTheDocument();
    expect(within(card).getByText(/081-234-5678/)).toBeInTheDocument();
    expect(within(card).getByText(/somchai@example\.com/)).toBeInTheDocument();
    expect(within(card).getByText(/· somchai$/)).toBeInTheDocument();
    expect(within(card).getByText(/แฟกซ์ 02-111-2222/)).toBeInTheDocument();
    expect(within(card).getByText("ผู้ติดต่อหลัก")).toBeInTheDocument();
  });

  it("falls back to the name as position and hides empty channels", async () => {
    serveProfile([
      makeVendorContact({
        contactName: "สมหญิง",
        contactPosition: "",
        contactPhone: "",
        contactEmail: "",
        lineId: "",
        otherContact: "",
        isMainContact: notMain,
      }),
    ]);

    renderWithQueryClient(<Contract />);

    const [card] = await waitForCards();
    // ชื่อ + ตำแหน่ง (ใช้ชื่อแทน) และไม่มีตัวคั่น "·"
    expect(within(card).getAllByText("สมหญิง")).toHaveLength(2);
    expect(card.textContent).not.toContain("·");
    expect(within(card).queryByText("ผู้ติดต่อหลัก")).not.toBeInTheDocument();
  });

  it("puts the main contact first regardless of the API order", async () => {
    serveProfile([
      makeVendorContact({ id: 1, contactName: "รอง หนึ่ง", isMainContact: notMain }),
      makeVendorContact({ id: 2, contactName: "หลัก สอง", isMainContact: true as unknown as string }),
      makeVendorContact({ id: 3, contactName: "รอง สาม", isMainContact: notMain }),
    ]);

    renderWithQueryClient(<Contract />);

    const rendered = await waitForCards();
    expect(rendered).toHaveLength(3);
    expect(within(rendered[0]).getByText("หลัก สอง")).toBeInTheDocument();
    expect(within(rendered[0]).getByText("ผู้ติดต่อหลัก")).toBeInTheDocument();
    expect(within(rendered[1]).getByText("รอง หนึ่ง")).toBeInTheDocument();
    expect(within(rendered[2]).getByText("รอง สาม")).toBeInTheDocument();
    expect(screen.getAllByText("ผู้ติดต่อหลัก")).toHaveLength(1);
  });

  it("disables deleting the main contact with a reason", async () => {
    serveProfile([
      makeVendorContact({ id: 1, contactName: "หลัก", isMainContact: true as unknown as string }),
      makeVendorContact({ id: 2, contactName: "รอง", isMainContact: notMain }),
    ]);

    renderWithQueryClient(<Contract />);

    const [main, secondary] = await waitForCards();
    const mainDelete = within(main).getByRole("button", { name: "ลบผู้ติดต่อ" });
    expect(mainDelete).toBeDisabled();
    expect(within(secondary).getByRole("button", { name: "ลบผู้ติดต่อ" })).toBeEnabled();

    focusDeleteWrapper(main);
    expect(await screen.findByText("ไม่สามารถลบผู้ติดต่อหลักได้")).toBeInTheDocument();
  });

  it("disables deleting the only contact with a reason", async () => {
    serveProfile([makeVendorContact({ id: 1, isMainContact: notMain })]);

    renderWithQueryClient(<Contract />);

    const [only] = await waitForCards();
    expect(within(only).getByRole("button", { name: "ลบผู้ติดต่อ" })).toBeDisabled();

    focusDeleteWrapper(only);
    expect(await screen.findByText("ต้องมีผู้ติดต่ออย่างน้อย 1 คน")).toBeInTheDocument();
  });

  it("prefers the main-contact reason over the last-contact reason", async () => {
    serveProfile([makeVendorContact({ id: 1, isMainContact: true as unknown as string })]);

    renderWithQueryClient(<Contract />);
    const [only] = await waitForCards();

    focusDeleteWrapper(only);
    expect(await screen.findByText("ไม่สามารถลบผู้ติดต่อหลักได้")).toBeInTheDocument();
    expect(screen.queryByText("ต้องมีผู้ติดต่ออย่างน้อย 1 คน")).not.toBeInTheDocument();
  });

  it("gives every card view, edit and delete actions", async () => {
    serveProfile([makeVendorContact({ id: 1 }), makeVendorContact({ id: 2, isMainContact: notMain })]);

    renderWithQueryClient(<Contract />);

    for (const card of await waitForCards()) {
      expect(within(card).getByRole("button", { name: "ดูรายละเอียดผู้ติดต่อ" })).toBeInTheDocument();
      expect(within(card).getByRole("button", { name: "แก้ไขผู้ติดต่อ" })).toBeInTheDocument();
      expect(within(card).getByRole("button", { name: "ลบผู้ติดต่อ" })).toBeInTheDocument();
    }
  });

  it("shows no cards, only the add button, when the vendor has no contacts", async () => {
    serveProfile([]);

    renderWithQueryClient(<Contract />);

    await screen.findByRole("heading", { name: "ผู้ติดต่อ" });
    await screen.findByRole("button", { name: "เพิ่มผู้ติดต่อ" });
    await waitFor(() => expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "แก้ไขผู้ติดต่อ" })).not.toBeInTheDocument();
  });

  it("shows no cards when the vendor profile does not exist (404)", async () => {
    server.use(http.get(PROFILE_URL, () => HttpResponse.json({}, { status: 404 })));

    renderWithQueryClient(<Contract />);

    await screen.findByRole("heading", { name: "ผู้ติดต่อ" });
    await waitFor(() => expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "แก้ไขผู้ติดต่อ" })).not.toBeInTheDocument();
  });
});

async function waitForCards() {
  await screen.findAllByRole("button", { name: "แก้ไขผู้ติดต่อ" });
  return cards();
}

// ปุ่มที่ disabled โฟกัสไม่ได้ จึงโฟกัส <span tabindex=0> ที่ครอบอยู่เพื่อเปิด tooltip
function focusDeleteWrapper(card: HTMLElement) {
  const wrapper = within(card).getByRole("button", { name: "ลบผู้ติดต่อ" }).parentElement as HTMLElement;
  act(() => wrapper.focus());
}
