import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { TenderProjectStatusSelect } from "@/components/tender-project-status-select";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";
import { makeTenderProject } from "@/tests/fixtures/tender-projects";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tender-projects/:id/status");
const FALLBACK = "เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const LABELS: Record<TenderProjectStatus, string> = {
  draft: "ร่าง",
  published: "กำลังดำเนินการ",
  closed: "ปิดรับซอง",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  archived: "เก็บถาวร",
};
const ALL_LABELS = Object.values(LABELS);

function setup(status: TenderProjectStatus = "draft", id = 7) {
  const rendered = renderWithQueryClient(<TenderProjectStatusSelect id={id} status={status} />);
  return { ...rendered, user: userEvent.setup() };
}

function serveStatus() {
  const calls: { id: unknown; body: unknown }[] = [];
  server.use(
    http.patch(URL_, async ({ params, request }) => {
      const body = (await request.json()) as { status: TenderProjectStatus };
      calls.push({ id: params.id, body });
      return HttpResponse.json({ data: makeTenderProject({ id: Number(params.id), status: body.status }) });
    }),
  );
  return calls;
}

async function choose(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("TenderProjectStatusSelect — display", () => {
  it.each(Object.entries(LABELS))("shows the %s status as %s", (status, label) => {
    setup(status as TenderProjectStatus);

    expect(screen.getByRole("combobox")).toHaveTextContent(label);
  });

  // ไม่มีกฎ "สถานะถัดไปที่ทำได้" ฝั่ง UI — เมนูเสนอทั้ง 6 สถานะเสมอ (backend เป็นผู้ตัดสินและตอบ 422)
  it.each(Object.keys(LABELS))("offers all six statuses in order when the current status is %s", async (status) => {
    const { user } = setup(status as TenderProjectStatus);

    await user.click(screen.getByRole("combobox"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(ALL_LABELS);
  });
});

describe("TenderProjectStatusSelect — changing the status", () => {
  it("patches the project's status, toasts success and refetches tenders_projects queries", async () => {
    const calls = serveStatus();
    const { user, queryClient } = setup("draft", 7);
    queryClient.setQueryData(["tenders_projects", "list", {}, 1, 20], []);

    await choose(user, "กำลังดำเนินการ");

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เปลี่ยนสถานะสำเร็จ"));
    expect(calls).toEqual([{ id: "7", body: { status: "published" } }]);
    expect(queryClient.getQueryState(["tenders_projects", "list", {}, 1, 20])?.isInvalidated).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("starts a promise toast with the loading text", async () => {
    serveStatus();
    const { user } = setup("draft");

    await choose(user, "ยกเลิก");

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.promise).toHaveBeenCalledExactlyOnceWith(
      expect.any(Promise),
      expect.objectContaining({ loading: "กำลังเปลี่ยนสถานะ...", success: "เปลี่ยนสถานะสำเร็จ" }),
    );
  });

  it.each(Object.entries(LABELS))("sends status %s when %s is chosen", async (status, label) => {
    const calls = serveStatus();
    // เริ่มจากสถานะที่ไม่ใช่ตัวที่จะเลือก
    const { user } = setup(status === "draft" ? "archived" : "draft", 3);

    await choose(user, label);

    await waitFor(() => expect(calls).toEqual([{ id: "3", body: { status } }]));
  });

  it("sends no request when the current status is chosen again", async () => {
    const calls = serveStatus();
    const { user } = setup("published");

    await choose(user, "กำลังดำเนินการ");

    expect(calls).toEqual([]);
    expect(toast.promise).not.toHaveBeenCalled();
  });

  it("shows the backend message on a 422 and keeps the old status", async () => {
    server.use(
      http.patch(URL_, () =>
        HttpResponse.json({ message: "ไม่สามารถเปลี่ยนเป็นสถานะนี้ได้" }, { status: 422 }),
      ),
    );
    const { user } = setup("draft");

    await choose(user, "เสร็จสิ้น");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่สามารถเปลี่ยนเป็นสถานะนี้ได้"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toHaveTextContent("ร่าง");
  });

  it("uses the fallback on a 422 without a message", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({}, { status: 422 })));
    const { user } = setup("draft");

    await choose(user, "เสร็จสิ้น");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  // ข้อความของ 403 เป็นภาษาอังกฤษจาก Laravel จึงจงใจไม่นำมาแสดง (ดู getErrorMessage)
  it("ignores the backend message on a 403 and uses the fallback", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({ message: "This action is unauthorized." }, { status: 403 })));
    const { user } = setup("draft");

    await choose(user, "เสร็จสิ้น");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text on a 500 with no body", async () => {
    server.use(http.patch(URL_, () => new HttpResponse(null, { status: 500 })));
    const { user } = setup("draft");

    await choose(user, "เสร็จสิ้น");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text on a network error", async () => {
    server.use(http.patch(URL_, () => HttpResponse.error()));
    const { user } = setup("draft");

    await choose(user, "เสร็จสิ้น");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("still refetches tenders_projects queries after a failure", async () => {
    server.use(http.patch(URL_, () => new HttpResponse(null, { status: 500 })));
    const { user, queryClient } = setup("draft");
    queryClient.setQueryData(["tenders_projects", "list", {}, 1, 20], []);

    await choose(user, "เสร็จสิ้น");

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await waitFor(() =>
      expect(queryClient.getQueryState(["tenders_projects", "list", {}, 1, 20])?.isInvalidated).toBe(true),
    );
  });
});

describe("TenderProjectStatusSelect — pending", () => {
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
        return HttpResponse.json({ data: makeTenderProject({ status: "published" }) });
      }),
    );
    const { user } = setup("draft");

    await choose(user, "กำลังดำเนินการ");
    await waitFor(() => expect(bodies).toHaveLength(1));
    await choose(user, "ยกเลิก");
    expect(bodies).toEqual([{ status: "published" }]);
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
        return HttpResponse.json({ data: makeTenderProject({ status: "published" }) });
      }),
    );
    const { user } = setup("draft");
    const trigger = screen.getByRole("combobox");
    expect(trigger.querySelector("svg.animate-spin")).toBeNull();

    await choose(user, "กำลังดำเนินการ");

    await waitFor(() => expect(trigger.querySelector("svg.animate-spin")).not.toBeNull());
    release();
    await waitFor(() => expect(trigger.querySelector("svg.animate-spin")).toBeNull());
  });
});
