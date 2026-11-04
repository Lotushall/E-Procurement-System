import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { InternalProfileCard } from "@/app/dashboard/internal-employees/_components/table/internal-profile-card";
import type { InternalProfile } from "@/lib/internal-profiles/types";
import { makeDepartment, makeInternalProfile, makePosition } from "@/tests/fixtures/internal-profiles";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const PROFILE = makeInternalProfile({
  id: 7,
  userId: null,
  employeeNo: "EMP-007",
  prefix: "นาย",
  firstname: "สมชาย",
  lastname: "ใจดี",
  department: makeDepartment({ id: 1, name: "จัดซื้อ" }),
  position: makePosition({ id: 5, name: "ผู้จัดการ" }),
  phone: "081-234-5678",
});

function renderCard(profile: InternalProfile = PROFILE, currentUserId = 1000) {
  signInAs({ id: currentUserId });
  server.use(
    http.get(apiUrl("/api/v1/dashboard/departments/select"), () => HttpResponse.json({ data: [] })),
    http.get(apiUrl("/api/v1/dashboard/positions/select"), () => HttpResponse.json({ data: [] })),
  );
  const rendered = renderWithQueryClient(<InternalProfileCard profile={profile} />);
  return { ...rendered, user: userEvent.setup() };
}

const menuButton = () => screen.getByRole("button", { name: "ตัวเลือกของพนักงาน" });

describe("InternalProfileCard — content", () => {
  it("shows the employee number, prefixed name, position and department", () => {
    renderCard();

    const card = screen.getByRole("article");
    expect(within(card).getByText("EMP-007")).toBeInTheDocument();
    expect(within(card).getByText("นายสมชาย ใจดี")).toBeInTheDocument();
    expect(within(card).getByText("ผู้จัดการ")).toBeInTheDocument();
    expect(within(card).getByText("จัดซื้อ")).toBeInTheDocument();
  });

  it("shows the first letter of the first name as the avatar", () => {
    renderCard();

    expect(within(screen.getByRole("article")).getByText("ส")).toBeInTheDocument();
  });

  it("skips a leading vowel when picking the avatar letter", () => {
    renderCard(makeInternalProfile({ firstname: "เกศินี" }));

    expect(within(screen.getByRole("article")).getByText("ก")).toBeInTheDocument();
  });

  it("shows a question mark when the first name is blank", () => {
    renderCard(makeInternalProfile({ firstname: "  " }));

    expect(within(screen.getByRole("article")).getByText("?")).toBeInTheDocument();
  });

  it("shows placeholders for a missing employee number, position and department", () => {
    renderCard(makeInternalProfile({ employeeNo: "", position: null, department: null }));

    const card = screen.getByRole("article");
    expect(within(card).getByText("-")).toBeInTheDocument();
    expect(within(card).getByText("ยังไม่ระบุตำแหน่ง")).toBeInTheDocument();
    expect(within(card).getByText("ยังไม่ระบุแผนก")).toBeInTheDocument();
  });
});

describe("InternalProfileCard — contact actions", () => {
  it("offers a tap-to-call link with only the digits", () => {
    renderCard();

    const call = screen.getByRole("button", { name: "โทร 081-234-5678" });
    expect(call).toHaveAttribute("href", "tel:0812345678");
    expect(call).toHaveTextContent("081-234-5678");
  });

  it("shows a disabled no-phone button when the profile has no phone", () => {
    renderCard(makeInternalProfile({ phone: "" }));

    expect(screen.getByRole("button", { name: "ไม่มีเบอร์โทร" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^โทร/ })).not.toBeInTheDocument();
  });

  it("links to the user account when the profile has one", () => {
    renderCard(makeInternalProfile({ userId: 42 }));

    expect(screen.getByRole("button", { name: "ดูบัญชีผู้ใช้" })).toHaveAttribute("href", "/dashboard/users/detail?id=42");
  });

  it("has no account link when the profile has no user", () => {
    renderCard(makeInternalProfile({ userId: null }));

    expect(screen.queryByRole("button", { name: "ดูบัญชีผู้ใช้" })).not.toBeInTheDocument();
  });
});

describe("InternalProfileCard — options menu", () => {
  it("lists edit and delete", async () => {
    const { user } = renderCard();

    await user.click(menuButton());

    expect(await screen.findByRole("menuitem", { name: "แก้ไข" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "ลบ" })).toBeEnabled();
  });

  it("opens the edit dialog for the profile from the menu", async () => {
    const detail = vi.fn();
    server.use(
      http.get(apiUrl("/api/v1/dashboard/internal-profiles/:id"), ({ params }) => {
        detail(params.id);
        return HttpResponse.json({ data: PROFILE });
      }),
    );
    const { user } = renderCard();

    await user.click(menuButton());
    await user.click(await screen.findByRole("menuitem", { name: "แก้ไข" }));

    expect(await screen.findByRole("dialog", { name: "แก้ไขข้อมูลพนักงาน" })).toBeInTheDocument();
    expect(detail).toHaveBeenCalledExactlyOnceWith("7");
  });

  it("opens the delete confirmation and deletes the profile", async () => {
    const ids: unknown[] = [];
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/internal-profiles/:id"), ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderCard();

    await user.click(menuButton());
    await user.click(await screen.findByRole("menuitem", { name: "ลบ" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent('"นายสมชาย ใจดี"');
    await user.click(within(dialog).getByRole("button", { name: "ลบพนักงาน" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบพนักงานสำเร็จ"));
    expect(ids).toEqual(["7"]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("does not delete when the confirmation is cancelled", async () => {
    const ids: unknown[] = [];
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/internal-profiles/:id"), ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderCard();

    await user.click(menuButton());
    await user.click(await screen.findByRole("menuitem", { name: "ลบ" }));
    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(ids).toEqual([]);
  });

  it("blocks deleting the signed-in user's own profile", async () => {
    const own = makeInternalProfile({ id: 9, userId: 77 });
    const { user, queryClient } = renderCard(own, 77);
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    await user.click(menuButton());

    const item = await screen.findByRole("menuitem", { name: "ลบบัญชีตัวเองไม่ได้" });
    await waitFor(() => expect(item).toHaveAttribute("aria-disabled", "true"));
    await user.click(item);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
