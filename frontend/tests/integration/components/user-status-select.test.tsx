import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { UserStatusSelect } from "@/components/user-status-select";
import type { UserStatus } from "@/lib/user/management/types";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users/:id/status");
const FALLBACK = "เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const LABELS: Record<UserStatus, string> = {
  pending: "รอตรวจสอบ",
  active: "ใช้งานอยู่",
  suspended: "ระงับการใช้งาน",
  inactive: "ปิดใช้งาน",
};

function setup(status: UserStatus = "active", id = 7) {
  const rendered = renderWithQueryClient(<UserStatusSelect id={id} status={status} />);
  return { ...rendered, user: userEvent.setup() };
}

function serveStatus() {
  const calls: { id: unknown; body: unknown }[] = [];
  server.use(
    http.patch(URL_, async ({ params, request }) => {
      const body = (await request.json()) as { status: UserStatus };
      calls.push({ id: params.id, body });
      return HttpResponse.json({ data: { status: body.status } });
    }),
  );
  return calls;
}

async function choose(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("UserStatusSelect — display", () => {
  it.each(Object.entries(LABELS))("shows the %s status as %s", (status, label) => {
    setup(status as UserStatus);

    expect(screen.getByRole("combobox")).toHaveTextContent(label);
  });

  it("offers all four statuses, including the current one", async () => {
    const { user } = setup("pending");

    await user.click(screen.getByRole("combobox"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["รอตรวจสอบ", "ใช้งานอยู่", "ระงับการใช้งาน", "ปิดใช้งาน"]);
  });
});

describe("UserStatusSelect — changing the status", () => {
  it("patches the user's status, toasts success and refetches users queries", async () => {
    const calls = serveStatus();
    const { user, queryClient } = setup("active", 7);
    queryClient.setQueryData(["users", "list", {}, 1, 20], []);

    await choose(user, "ระงับการใช้งาน");

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เปลี่ยนสถานะสำเร็จ"));
    expect(calls).toEqual([{ id: "7", body: { status: "suspended" } }]);
    expect(queryClient.getQueryState(["users", "list", {}, 1, 20])?.isInvalidated).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("starts a promise toast with the loading text", async () => {
    serveStatus();
    const { user } = setup("active");

    await choose(user, "ปิดใช้งาน");

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.promise).toHaveBeenCalledExactlyOnceWith(
      expect.any(Promise),
      expect.objectContaining({ loading: "กำลังเปลี่ยนสถานะ...", success: "เปลี่ยนสถานะสำเร็จ" }),
    );
  });

  it("sends no request when the current status is chosen again", async () => {
    const calls = serveStatus();
    const { user } = setup("active");

    await choose(user, "ใช้งานอยู่");

    expect(calls).toEqual([]);
    expect(toast.promise).not.toHaveBeenCalled();
  });

  it("shows the backend message when the change is rejected and keeps the old status", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({ message: "ไม่มีสิทธิ์เปลี่ยนสถานะ" }, { status: 403 })));
    const { user } = setup("active");

    await choose(user, "ระงับการใช้งาน");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่มีสิทธิ์เปลี่ยนสถานะ"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toHaveTextContent("ใช้งานอยู่");
  });

  it("falls back to the generic text when the response has no message", async () => {
    server.use(http.patch(URL_, () => new HttpResponse(null, { status: 500 })));
    const { user } = setup("active");

    await choose(user, "ระงับการใช้งาน");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text on a network error", async () => {
    server.use(http.patch(URL_, () => HttpResponse.error()));
    const { user } = setup("active");

    await choose(user, "ระงับการใช้งาน");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("still refetches users queries after a failure", async () => {
    server.use(http.patch(URL_, () => new HttpResponse(null, { status: 500 })));
    const { user, queryClient } = setup("active");
    queryClient.setQueryData(["users", "list", {}, 1, 20], []);

    await choose(user, "ปิดใช้งาน");

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await waitFor(() => expect(queryClient.getQueryState(["users", "list", {}, 1, 20])?.isInvalidated).toBe(true));
  });
});

describe("UserStatusSelect — pending", () => {
  it("ignores a second choice while the first request is still running", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    server.use(
      http.patch(URL_, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return HttpResponse.json({ data: { status: "suspended" } });
      }),
    );
    const { user } = setup("active");

    await choose(user, "ระงับการใช้งาน");
    await waitFor(() => expect(bodies).toHaveLength(1));
    // ระหว่างรอ ยังเปิดเมนูและเลือกอีกสถานะได้ แต่ต้องไม่ส่งคำขอที่สอง
    await choose(user, "ปิดใช้งาน");
    expect(bodies).toEqual([{ status: "suspended" }]);
    expect(toast.promise).toHaveBeenCalledTimes(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เปลี่ยนสถานะสำเร็จ"));
    expect(bodies).toHaveLength(1);
  });

  it("swaps the status dot for a spinner while the request runs", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.patch(URL_, async () => {
        await gate;
        return HttpResponse.json({ data: { status: "suspended" } });
      }),
    );
    const { user } = setup("active");
    const trigger = screen.getByRole("combobox");
    expect(trigger.querySelector("svg.animate-spin")).toBeNull();

    await choose(user, "ระงับการใช้งาน");

    await waitFor(() => expect(trigger.querySelector("svg.animate-spin")).not.toBeNull());
    release();
    await waitFor(() => expect(trigger.querySelector("svg.animate-spin")).toBeNull());
  });
});

describe("UserStatusSelect — request target", () => {
  it("uses the id prop in the URL", async () => {
    const calls = serveStatus();
    const { user } = setup("pending", 42);

    await choose(user, "ใช้งานอยู่");

    await waitFor(() => expect(calls).toEqual([{ id: "42", body: { status: "active" } }]));
  });
});
