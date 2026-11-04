import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { UserDetailHeader } from "@/app/dashboard/users/detail/_components/user-detail-header";
import type { UserDetail } from "@/lib/user/management/types";
import { makeInternalProfileFields, makeUserDetail } from "@/tests/fixtures/user-management";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const INTERNAL = makeUserDetail({ id: 7, username: "somchai", name: "สมชาย ใจดี", email: "somchai@example.com" });

async function renderHeader(
  user: UserDetail = INTERNAL,
  auth: Parameters<typeof signInAs>[0] = { id: 1000, permissions: ["users.update"] },
) {
  signInAs(auth);
  const rendered = renderWithQueryClient(<UserDetailHeader user={user} status={user.status} />);
  // รอให้ useUser() โหลดเสร็จก่อน เพื่อให้ผลของ hasPermission นิ่งแล้ว
  await waitFor(() => expect(rendered.queryClient.getQueryData(["auth", "user"])).toBeTruthy());
  return { ...rendered, actor: userEvent.setup() };
}

describe("UserDetailHeader — identity", () => {
  it("shows the username, name, email, initials and the status badge", async () => {
    await renderHeader();

    expect(screen.getByRole("heading", { level: 1, name: "somchai" })).toBeInTheDocument();
    expect(screen.getByText("สมชาย ใจดี · somchai@example.com")).toBeInTheDocument();
    expect(screen.getByText("S", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("ใช้งานอยู่")).toBeInTheDocument();
  });

  it("shows the badge for the status prop (not user.status)", async () => {
    signInAs({ permissions: [] });
    renderWithQueryClient(<UserDetailHeader user={INTERNAL} status="suspended" />);

    expect(await screen.findByText("ระงับการใช้งาน")).toBeInTheDocument();
    expect(screen.queryByText("ใช้งานอยู่")).not.toBeInTheDocument();
  });

  it("links the edit button to the edit page of this user", async () => {
    await renderHeader();

    expect(screen.getByRole("button", { name: "แก้ไข" })).toHaveAttribute("href", "/dashboard/users/edit?id=7");
  });
});

describe("UserDetailHeader — profile link by user type", () => {
  it("links an internal user to the employee list searched by full name", async () => {
    await renderHeader();

    expect(screen.getByRole("button", { name: "ดูข้อมูลพนักงานภายใน" })).toHaveAttribute(
      "href",
      `/dashboard/internal-employees?search=${encodeURIComponent("สมชาย ใจดี")}`,
    );
    expect(screen.queryByRole("button", { name: "ดูข้อมูลผู้ค้า" })).not.toBeInTheDocument();
  });

  it("links an internal user without a profile to the unfiltered employee list", async () => {
    await renderHeader(makeUserDetail({ id: 7, internalProfile: null }));

    expect(screen.getByRole("button", { name: "ดูข้อมูลพนักงานภายใน" })).toHaveAttribute(
      "href",
      "/dashboard/internal-employees",
    );
  });

  it("searches by the only name part when one is missing", async () => {
    await renderHeader(
      makeUserDetail({ id: 7, internalProfile: makeInternalProfileFields({ firstname: "สมชาย", lastname: "" }) }),
    );

    expect(screen.getByRole("button", { name: "ดูข้อมูลพนักงานภายใน" })).toHaveAttribute(
      "href",
      `/dashboard/internal-employees?search=${encodeURIComponent("สมชาย")}`,
    );
  });

  it.each([["company"], ["individual"]] as const)("links a %s user to the vendor detail page", async (userType) => {
    await renderHeader(
      makeUserDetail({ id: 9, userType, vendorProfileId: 3, role: null, internalProfile: null }),
    );

    expect(screen.getByRole("button", { name: "ดูข้อมูลผู้ค้า" })).toHaveAttribute(
      "href",
      "/dashboard/vendors/detail?id=3",
    );
    expect(screen.queryByRole("button", { name: "ดูข้อมูลพนักงานภายใน" })).not.toBeInTheDocument();
  });
});

describe("UserDetailHeader — edit action by permission", () => {
  it("shows the edit button with users.update", async () => {
    await renderHeader(INTERNAL, { id: 1000, permissions: ["users.update"] });

    expect(screen.getByRole("button", { name: "แก้ไข" })).toBeInTheDocument();
  });

  it("hides the edit button without users.update", async () => {
    await renderHeader(INTERNAL, { id: 1000, permissions: ["users.delete"] });

    expect(screen.queryByRole("button", { name: "แก้ไข" })).not.toBeInTheDocument();
  });
});

describe("UserDetailHeader — delete action by permission", () => {
  it("hides the delete button without users.delete", async () => {
    await renderHeader(INTERNAL, { id: 1000, permissions: ["users.update"] });

    expect(screen.queryByRole("button", { name: "ลบ user" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แก้ไข" })).toBeInTheDocument();
  });

  it("shows the delete button with users.delete", async () => {
    await renderHeader(INTERNAL, { id: 1000, permissions: ["users.delete"] });

    expect(await screen.findByRole("button", { name: "ลบ user" })).toBeEnabled();
  });

  it("disables the delete button when the viewed user is the signed-in user", async () => {
    await renderHeader(INTERNAL, { id: 7, permissions: ["users.delete"] });

    expect(await screen.findByRole("button", { name: "ลบ user" })).toBeDisabled();
  });

  it("deletes the user and goes back to the user list after confirming", async () => {
    const calls: { id: unknown }[] = [];
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/users/:id"), ({ params }) => {
        calls.push({ id: params.id });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { actor } = await renderHeader(INTERNAL, { id: 1000, permissions: ["users.delete"] });

    await actor.click(await screen.findByRole("button", { name: "ลบ user" }));
    await actor.click(await screen.findByRole("button", { name: "ลบผู้ใช้" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard/users"));
    expect(calls).toEqual([{ id: "7" }]);
    expect(toast.success).toHaveBeenCalledWith("ลบผู้ใช้สำเร็จ");
  });

  it("stays on the page when the delete fails", async () => {
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/users/:id"), () =>
        HttpResponse.json({ message: "ลบไม่ได้" }, { status: 409 }),
      ),
    );
    const { actor } = await renderHeader(INTERNAL, { id: 1000, permissions: ["users.delete"] });

    await actor.click(await screen.findByRole("button", { name: "ลบ user" }));
    await actor.click(await screen.findByRole("button", { name: "ลบผู้ใช้" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบไม่ได้"));
    expect(router.push).not.toHaveBeenCalled();
  });
});
