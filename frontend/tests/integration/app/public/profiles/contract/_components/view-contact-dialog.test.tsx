import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ViewContactDialog from "@/app/(public)/profiles/contract/_components/view-contact-dialog";
import { makeVendorContact } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";

async function openDialog(contact = makeVendorContact()) {
  const user = userEvent.setup();
  renderWithQueryClient(<ViewContactDialog contact={contact} />);
  await user.click(screen.getByRole("button", { name: "ดูรายละเอียดผู้ติดต่อ" }));
  const dialog = await screen.findByRole("dialog");
  return { user, dialog };
}

describe("ViewContactDialog", () => {
  it("shows every contact field, the initials and the main-contact badge", async () => {
    const { dialog } = await openDialog(
      makeVendorContact({
        contactName: "สมชาย ใจดี",
        contactPosition: "ผู้จัดการ",
        contactPhone: "0812345678",
        contactEmail: "somchai@example.com",
        lineId: "somchai",
        otherContact: "แฟกซ์ 02-111-2222",
        isMainContact: true,
      }),
    );

    expect(within(dialog).getByText("รายละเอียดผู้ติดต่อ")).toBeInTheDocument();
    expect(within(dialog).getByText("สมชาย ใจดี")).toBeInTheDocument();
    expect(within(dialog).getByText("สใ")).toBeInTheDocument();
    expect(within(dialog).getByText("ผู้ติดต่อหลัก")).toBeInTheDocument();
    expect(within(dialog).getByText("ผู้จัดการ")).toBeInTheDocument();
    expect(within(dialog).getByText("081-234-5678")).toBeInTheDocument();
    expect(within(dialog).getByText("somchai@example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("somchai")).toBeInTheDocument();
    expect(within(dialog).getByText("แฟกซ์ 02-111-2222")).toBeInTheDocument();
  });

  it("omits the badge and every empty field for a bare, non-main contact", async () => {
    const { dialog } = await openDialog(
      makeVendorContact({
        contactName: "สมหญิง",
        contactPosition: "",
        contactPhone: "",
        contactEmail: "",
        lineId: "",
        otherContact: "",
        isMainContact: false,
      }),
    );

    expect(within(dialog).getByText("สมหญิง")).toBeInTheDocument();
    expect(within(dialog).queryByText("ผู้ติดต่อหลัก")).not.toBeInTheDocument();
    // เหลือแค่ชื่อ + ปุ่มปิด ไม่มีบรรทัดรายละเอียดว่างๆ
    expect(dialog.querySelector("svg.lucide-phone")).not.toBeInTheDocument();
    expect(dialog.querySelector("svg.lucide-mail")).not.toBeInTheDocument();
    expect(dialog.querySelector("svg.lucide-message-circle")).not.toBeInTheDocument();
    expect(dialog.querySelector("svg.lucide-ellipsis")).not.toBeInTheDocument();
  });

  it("closes with the close button", async () => {
    const { user } = await openDialog();

    await user.click(screen.getByRole("button", { name: "ปิด" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
