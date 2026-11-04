import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { SessionsTab } from "@/app/dashboard/users/detail/_components/sessions-tab";
import type { SessionInfo } from "@/lib/user/management/types";
import { makeCurrentUser } from "@/tests/fixtures/users";
import { makeUserSession } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

freezeTimeAt("2026-11-02T10:00:00+07:00");

const LIST_URL = apiUrl("/api/v1/dashboard/users/:id/sessions");
const ONE_URL = apiUrl("/api/v1/dashboard/users/:id/sessions/:sessionId");
const FALLBACK = "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const USER_ID = 7;

const CHROME = makeUserSession({
  id: "s-chrome",
  device: "Desktop",
  browser: "Chrome",
  os: "Windows",
  ipAddress: "192.168.1.10",
  lastActiveAt: "2026-11-02T02:30:00.000000Z", // 30 นาทีก่อนเวลาที่ล็อกไว้
  current: true,
});
const SAFARI = makeUserSession({
  id: "s-safari",
  device: "Mobile",
  browser: "Safari",
  os: "iOS",
  ipAddress: "10.0.0.5",
  lastActiveAt: "2026-10-31T03:00:00.000000Z", // 2 วันก่อน
  current: false,
});
const FIREFOX = makeUserSession({
  id: "s-firefox",
  device: "Tablet",
  browser: "Firefox",
  os: "Android",
  ipAddress: "172.16.0.9",
  lastActiveAt: "2026-11-01T03:00:00.000000Z",
  current: false,
});

// เซิร์ฟเวอร์แบบมีสถานะ: DELETE แล้วรายการที่ GET ครั้งถัดไปเปลี่ยนตาม
function serveSessions(initial: SessionInfo[]) {
  let sessions = [...initial];
  const state = {
    lists: 0,
    deletes: [] as { id: unknown; sessionId?: unknown; query: Record<string, string> }[],
  };
  server.use(
    http.get(LIST_URL, () => {
      state.lists += 1;
      return HttpResponse.json({ data: sessions });
    }),
    http.delete(ONE_URL, ({ params, request }) => {
      state.deletes.push({
        id: params.id,
        sessionId: params.sessionId,
        query: Object.fromEntries(new URL(request.url).searchParams),
      });
      sessions = sessions.filter((session) => session.id !== params.sessionId);
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(LIST_URL, ({ params, request }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams);
      state.deletes.push({ id: params.id, query });
      sessions = query.keep_current ? sessions.filter((session) => session.current) : [];
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return state;
}

async function renderTab(initial: SessionInfo[] = [CHROME, SAFARI]) {
  const state = serveSessions(initial);
  const rendered = renderWithQueryClient(<SessionsTab userId={USER_ID} />);
  await screen.findByRole("heading", { name: /Active Sessions/ });
  return { ...rendered, state, actor: userEvent.setup() };
}

function sessionCard(ip: string): HTMLElement {
  return screen.getByText(ip).closest("[data-slot='card']") as HTMLElement;
}

const revokeOne = (ip: string) => within(sessionCard(ip)).getByRole("button", { name: "เพิกถอน" });
const revokeOthers = () => screen.getByRole("button", { name: "เพิกถอน session อื่นทั้งหมด" });
const revokeAll = () => screen.getByRole("button", { name: "เพิกถอน session ทั้งหมด" });

describe("SessionsTab — loading and list", () => {
  it("shows a spinner while loading and no heading", async () => {
    server.use(http.get(LIST_URL, () => new Promise<Response>(() => {})));

    renderWithQueryClient(<SessionsTab userId={USER_ID} />);

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Active Sessions/ })).not.toBeInTheDocument();
  });

  it("shows the error text (not a spinner) when loading fails", async () => {
    server.use(http.get(LIST_URL, () => new HttpResponse(null, { status: 500 })));

    renderWithQueryClient(<SessionsTab userId={USER_ID} />);

    expect(await screen.findByText("ไม่สามารถโหลดรายการ session ได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
  });

  it("requests the sessions of the given user", async () => {
    const ids: unknown[] = [];
    server.use(
      http.get(LIST_URL, ({ params }) => {
        ids.push(params.id);
        return HttpResponse.json({ data: [CHROME] });
      }),
    );

    renderWithQueryClient(<SessionsTab userId={USER_ID} />);

    await screen.findByRole("heading", { name: "Active Sessions (1)" });
    expect(ids).toEqual(["7"]);
  });

  it("lists browser, OS, IP and relative last-active time for each session", async () => {
    await renderTab([CHROME, SAFARI]);

    expect(screen.getByRole("heading", { name: "Active Sessions (2)" })).toBeInTheDocument();
    const chrome = within(sessionCard("192.168.1.10"));
    expect(chrome.getByText("Chrome · Windows")).toBeInTheDocument();
    expect(chrome.getByText("ใช้งานล่าสุด 30 นาทีที่ผ่านมา")).toBeInTheDocument();
    const safari = within(sessionCard("10.0.0.5"));
    expect(safari.getByText("Safari · iOS")).toBeInTheDocument();
    expect(safari.getByText("ใช้งานล่าสุด 2 วันที่ผ่านมา")).toBeInTheDocument();
  });

  it("marks only the current session", async () => {
    await renderTab([CHROME, SAFARI]);

    expect(within(sessionCard("192.168.1.10")).getByText("เซสชันปัจจุบัน")).toBeInTheDocument();
    expect(within(sessionCard("10.0.0.5")).queryByText("เซสชันปัจจุบัน")).not.toBeInTheDocument();
  });

  it("shows the empty state without any bulk revoke button", async () => {
    await renderTab([]);

    expect(screen.getByRole("heading", { name: "Active Sessions (0)" })).toBeInTheDocument();
    expect(screen.getByText("ไม่มี session ที่ใช้งานอยู่")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /เพิกถอน/ })).not.toBeInTheDocument();
  });

  it("hides revoke-others when the only session is the current one", async () => {
    await renderTab([CHROME]);

    expect(screen.queryByRole("button", { name: "เพิกถอน session อื่นทั้งหมด" })).not.toBeInTheDocument();
    expect(revokeAll()).toBeInTheDocument();
  });

  it("shows revoke-others when another session exists", async () => {
    await renderTab([CHROME, SAFARI]);

    expect(revokeOthers()).toBeInTheDocument();
  });
});

describe("SessionsTab — revoke one session", () => {
  it("opens a confirmation describing the session", async () => {
    const { actor } = await renderTab();

    await actor.click(revokeOne("10.0.0.5"));

    const dialog = await screen.findByRole("alertdialog", { name: "เพิกถอน Session" });
    expect(dialog).toHaveTextContent("ต้องการเพิกถอน session นี้ใช่หรือไม่? (Safari · iOS · 10.0.0.5)");
    expect(within(dialog).getByRole("button", { name: "เพิกถอน Session" })).toBeInTheDocument();
  });

  it("sends DELETE for that session, toasts, closes the dialog and refreshes the list", async () => {
    const { actor, state } = await renderTab([CHROME, SAFARI]);
    const listsBefore = state.lists;

    await actor.click(revokeOne("10.0.0.5"));
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เพิกถอน session แล้ว"));
    expect(state.deletes).toEqual([{ id: "7", sessionId: "s-safari", query: {} }]);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("10.0.0.5")).not.toBeInTheDocument());
    expect(state.lists).toBeGreaterThan(listsBefore);
    expect(screen.getByRole("heading", { name: "Active Sessions (1)" })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("closes without a request on cancel", async () => {
    const { actor, state } = await renderTab();

    await actor.click(revokeOne("10.0.0.5"));
    await actor.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(state.deletes).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText("10.0.0.5")).toBeInTheDocument();
  });

  it("closes without a request on Escape", async () => {
    const { actor, state } = await renderTab();

    await actor.click(revokeOne("10.0.0.5"));
    await screen.findByRole("alertdialog");
    await actor.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(state.deletes).toEqual([]);
  });

  it("toasts the fallback message when the request fails and still refetches the list", async () => {
    const { actor, state } = await renderTab();
    server.use(http.delete(ONE_URL, () => new HttpResponse(null, { status: 500 })));
    const listsBefore = state.lists;

    await actor.click(revokeOne("10.0.0.5"));
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(state.lists).toBeGreaterThan(listsBefore));
    expect(screen.getByText("10.0.0.5")).toBeInTheDocument();
  });

  it.skip("BUG: use-session-revocation.ts:38,45,52 error toasts (revoke one / others / all) ignore the backend message — they should show response.data.message and fall back to the Thai text", async () => {
    const { actor } = await renderTab();
    server.use(
      http.delete(ONE_URL, () => HttpResponse.json({ message: "ไม่มีสิทธิ์เพิกถอน session นี้" }, { status: 403 })),
    );

    await actor.click(revokeOne("10.0.0.5"));
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่มีสิทธิ์เพิกถอน session นี้"));
  });

  it("closes the dialog at once and sends a single request while pending", async () => {
    const { actor } = await renderTab();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    server.use(
      http.delete(ONE_URL, async () => {
        calls += 1;
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await actor.click(revokeOne("10.0.0.5"));
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session" }));

    // หลังกดยืนยัน dialog ปิดทันที จึงไม่มีปุ่มให้กดซ้ำระหว่างรอ
    await waitFor(() => expect(calls).toBe(1));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เพิกถอน Session" })).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();

    release();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เพิกถอน session แล้ว"));
    expect(calls).toBe(1);
  });
});

describe("SessionsTab — revoke other sessions", () => {
  it("opens a confirmation with the count of other sessions", async () => {
    const { actor } = await renderTab([CHROME, SAFARI, FIREFOX]);

    await actor.click(revokeOthers());

    const dialog = await screen.findByRole("alertdialog", { name: "เพิกถอน Session อื่นทั้งหมด" });
    expect(dialog).toHaveTextContent("ยกเว้นอุปกรณ์ปัจจุบัน (2 session จะถูกเพิกถอน)");
  });

  it("sends DELETE with keep_current=1, toasts, and keeps only the current session", async () => {
    const { actor, state } = await renderTab([CHROME, SAFARI, FIREFOX]);

    await actor.click(revokeOthers());
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session อื่นทั้งหมด" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เพิกถอน session อื่นทั้งหมดแล้ว"));
    expect(state.deletes).toEqual([{ id: "7", query: { keep_current: "1" } }]);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Active Sessions (1)" })).toBeInTheDocument();
    expect(screen.getByText("192.168.1.10")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เพิกถอน session อื่นทั้งหมด" })).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends nothing on cancel", async () => {
    const { actor, state } = await renderTab();

    await actor.click(revokeOthers());
    await actor.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(state.deletes).toEqual([]);
  });

  it("toasts the fallback message on failure", async () => {
    const { actor } = await renderTab();
    server.use(http.delete(LIST_URL, () => new HttpResponse(null, { status: 500 })));

    await actor.click(revokeOthers());
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session อื่นทั้งหมด" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("SessionsTab — revoke all sessions", () => {
  it("opens a confirmation with the total count", async () => {
    const { actor } = await renderTab([CHROME, SAFARI, FIREFOX]);

    await actor.click(revokeAll());

    const dialog = await screen.findByRole("alertdialog", { name: "เพิกถอน Session ทั้งหมด" });
    expect(dialog).toHaveTextContent("จากทุกอุปกรณ์ที่ใช้งานอยู่ (3 session จะถูกเพิกถอน)");
  });

  it("sends DELETE without keep_current and empties the list when the current session is not among them", async () => {
    const { actor, state } = await renderTab([SAFARI, FIREFOX]);

    await actor.click(revokeAll());
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session ทั้งหมด" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เพิกถอน session ทั้งหมดแล้ว"));
    expect(state.deletes).toEqual([{ id: "7", query: {} }]);
    expect(await screen.findByText("ไม่มี session ที่ใช้งานอยู่")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends nothing on Escape", async () => {
    const { actor, state } = await renderTab();

    await actor.click(revokeAll());
    await screen.findByRole("alertdialog");
    await actor.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(state.deletes).toEqual([]);
  });

  it("toasts the fallback message on failure", async () => {
    const { actor } = await renderTab();
    server.use(http.delete(LIST_URL, () => new HttpResponse(null, { status: 500 })));

    await actor.click(revokeAll());
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session ทั้งหมด" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("SessionsTab — revoking the signed-in session", () => {
  it("signs out and redirects to login after revoking the current session", async () => {
    const { actor, queryClient } = await renderTab([CHROME, SAFARI]);
    queryClient.setQueryData(["auth", "user"], makeCurrentUser());

    await actor.click(revokeOne("192.168.1.10"));
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(queryClient.getQueryData(["auth", "user"])).toBeNull();
  });

  it("signs out and redirects to login after revoking all sessions including the current one", async () => {
    const { actor, queryClient } = await renderTab([CHROME, SAFARI]);
    queryClient.setQueryData(["auth", "user"], makeCurrentUser());

    await actor.click(revokeAll());
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session ทั้งหมด" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(queryClient.getQueryData(["auth", "user"])).toBeNull();
  });

  it("does not sign out when revoking the current session fails", async () => {
    const { actor, queryClient } = await renderTab([CHROME, SAFARI]);
    const me = makeCurrentUser();
    queryClient.setQueryData(["auth", "user"], me);
    server.use(http.delete(ONE_URL, () => new HttpResponse(null, { status: 500 })));

    await actor.click(revokeOne("192.168.1.10"));
    await actor.click(await screen.findByRole("button", { name: "เพิกถอน Session" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
    expect(router.replace).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["auth", "user"])).toEqual(me);
  });
});
