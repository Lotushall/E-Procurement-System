import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { UserCard } from "@/app/dashboard/users/_components/table/user-card";
import type { UserListItem } from "@/lib/user/management/types";
import { makeManagedUser } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const USER = makeManagedUser({
  id: 7,
  username: "somchai",
  name: "สมชาย ใจดี",
  email: "somchai@example.com",
  userType: "internal",
  status: "active",
  createdAt: "2026-01-15T03:00:00.000000Z",
});

interface Perms {
  status?: boolean;
  update?: boolean;
  delete?: boolean;
  currentUserId?: number;
}

function renderCard(user: UserListItem = USER, perms: Perms = {}) {
  const rendered = renderWithQueryClient(
    <UserCard
      user={user}
      canUpdateStatus={perms.status ?? false}
      canUpdateUser={perms.update ?? false}
      canDeleteUser={perms.delete ?? false}
      currentUserId={perms.currentUserId ?? 1000}
    />,
  );
  return { ...rendered, user: userEvent.setup() };
}

const menuButton = () => screen.getByRole("button", { name: "ตัวเลือกของ somchai" });

describe("UserCard — content", () => {
  it("shows username, name, type, email and created date", () => {
    renderCard();

    const card = screen.getByRole("article");
    expect(within(card).getByText("somchai")).toBeInTheDocument();
    expect(within(card).getByText("สมชาย ใจดี")).toBeInTheDocument();
    expect(within(card).getByText("พนักงานภายใน")).toBeInTheDocument();
    expect(within(card).getByText("somchai@example.com")).toBeInTheDocument();
    expect(within(card).getByText("สร้างเมื่อ 15-01-2026")).toBeInTheDocument();
    expect(within(card).getByLabelText("อีเมล")).toBeInTheDocument();
    expect(within(card).getByLabelText("วันที่สร้าง")).toBeInTheDocument();
  });

  it("links the header to the user's detail page and shows the initials", () => {
    renderCard();

    const link = screen.getByRole("link", { name: /somchai/ });
    expect(link).toHaveAttribute("href", "/dashboard/users/detail?id=7");
    expect(within(link).getByText("S")).toBeInTheDocument();
  });

  it.each([
    ["internal", "พนักงานภายใน", "bg-red-700"],
    ["company", "นิติบุคคล", "bg-blue-700"],
    ["individual", "ร้านค้า", "bg-amber-700"],
  ] as const)("labels a %s user as %s and tints the avatar by type", (userType, label, avatarClass) => {
    renderCard(makeManagedUser({ userType, username: "abc" }));

    expect(within(screen.getByRole("article")).getByText(label)).toBeInTheDocument();
    expect(screen.getByText("A")).toHaveClass(avatarClass);
  });

  it("shows a dash when the created date cannot be parsed", () => {
    renderCard(makeManagedUser({ createdAt: "not-a-date" }));

    expect(screen.getByText("สร้างเมื่อ -")).toBeInTheDocument();
  });
});

describe("UserCard — status", () => {
  it("shows a read-only badge without the status permission", () => {
    renderCard(USER, { status: false });

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(screen.getByRole("article")).getByText("ใช้งานอยู่")).toBeInTheDocument();
  });

  it("shows an editable select with the status permission and patches the user", async () => {
    const calls: { id: unknown; body: unknown }[] = [];
    server.use(
      http.patch(apiUrl("/api/v1/dashboard/users/:id/status"), async ({ params, request }) => {
        calls.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ data: { status: "suspended" } });
      }),
    );
    const { user } = renderCard(USER, { status: true });
    expect(screen.getByRole("combobox")).toHaveTextContent("ใช้งานอยู่");

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "ระงับการใช้งาน" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เปลี่ยนสถานะสำเร็จ"));
    expect(calls).toEqual([{ id: "7", body: { status: "suspended" } }]);
  });
});

describe("UserCard — options menu", () => {
  it("has no menu without update or delete permission", () => {
    renderCard(USER, { status: true });

    expect(screen.queryByRole("button", { name: "ตัวเลือกของ somchai" })).not.toBeInTheDocument();
  });

  it("lists only edit with the update permission", async () => {
    const { user } = renderCard(USER, { update: true });

    await user.click(menuButton());

    expect(await screen.findByRole("menuitem", { name: "แก้ไข" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "ลบ" })).not.toBeInTheDocument();
  });

  it("lists only delete with the delete permission", async () => {
    const { user } = renderCard(USER, { delete: true });

    await user.click(menuButton());

    expect(await screen.findByRole("menuitem", { name: "ลบ" })).toBeEnabled();
    expect(screen.queryByRole("menuitem", { name: "แก้ไข" })).not.toBeInTheDocument();
  });

  it("navigates to the edit page from the menu", async () => {
    const { user } = renderCard(USER, { update: true });

    await user.click(menuButton());
    await user.click(await screen.findByRole("menuitem", { name: "แก้ไข" }));

    expect(router.push).toHaveBeenCalledExactlyOnceWith("/dashboard/users/edit?id=7");
  });

  it("opens the delete confirmation and deletes the user", async () => {
    const ids: unknown[] = [];
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/users/:id"), ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderCard(USER, { delete: true });

    await user.click(menuButton());
    await user.click(await screen.findByRole("menuitem", { name: "ลบ" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent('"somchai"');
    await user.click(within(dialog).getByRole("button", { name: "ลบผู้ใช้" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ใช้สำเร็จ"));
    expect(ids).toEqual(["7"]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("does not delete when the confirmation is cancelled", async () => {
    const ids: unknown[] = [];
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/users/:id"), ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderCard(USER, { delete: true });

    await user.click(menuButton());
    await user.click(await screen.findByRole("menuitem", { name: "ลบ" }));
    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(ids).toEqual([]);
  });

  it("blocks deleting the signed-in user's own account", async () => {
    const { user } = renderCard(USER, { delete: true, currentUserId: 7 });

    await user.click(menuButton());

    const item = await screen.findByRole("menuitem", { name: "ลบบัญชีตัวเองไม่ได้" });
    await waitFor(() => expect(item).toHaveAttribute("aria-disabled", "true"));
    await user.click(item);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
