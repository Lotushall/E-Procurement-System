import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { InternalProfileCombobox } from "@/components/internal-profile-combobox";
import { makeInternalProfileOption } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const OPTIONS_URL = apiUrl("/api/v1/dashboard/internal-profiles/select");
const OPTIONS = [
  makeInternalProfileOption({ id: 11, name: "สมชาย ใจดี" }),
  makeInternalProfileOption({ id: 12, name: "สมหญิง รักงาน" }),
  makeInternalProfileOption({ id: 13, name: "วิชัย มั่นคง" }),
];

function serveOptions(options = OPTIONS) {
  const requests = vi.fn();
  server.use(
    http.get(OPTIONS_URL, () => {
      requests();
      return HttpResponse.json({ data: options });
    }),
  );
  return requests;
}

type Props = Partial<React.ComponentProps<typeof InternalProfileCombobox>>;

function setup(props: Props = {}) {
  const onValueChange = vi.fn();
  const view = renderWithQueryClient(<InternalProfileCombobox value="" onValueChange={onValueChange} {...props} />);
  return { onValueChange, user: userEvent.setup(), ...view };
}

const trigger = () => screen.getByRole("combobox");

describe("InternalProfileCombobox", () => {
  it("loads the options from the select endpoint", async () => {
    const requests = serveOptions();
    const { user } = setup();

    await user.click(trigger());

    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(4));
    expect(requests).toHaveBeenCalledOnce();
  });

  it("lists the dash option first, then every employee", async () => {
    serveOptions();
    const { user } = setup();

    await user.click(trigger());

    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(4));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "---",
      "สมชาย ใจดี",
      "สมหญิง รักงาน",
      "วิชัย มั่นคง",
    ]);
    expect(screen.getByPlaceholderText("ค้นหาพนักงาน")).toBeInTheDocument();
  });

  it("shows the dash when the value is empty", () => {
    serveOptions();
    setup({ value: "" });

    expect(trigger()).toHaveTextContent("---");
  });

  it("shows the name of the chosen employee once the options have loaded", async () => {
    serveOptions();
    setup({ value: "12" });

    await waitFor(() => expect(trigger()).toHaveTextContent("สมหญิง รักงาน"));
  });

  it("shows the placeholder for an id that is not in the options", async () => {
    const requests = serveOptions();
    setup({ value: "999" });

    await waitFor(() => expect(requests).toHaveBeenCalled());
    expect(trigger()).toHaveTextContent("เลือกผู้รับผิดชอบ");
  });

  it("reports the id of the chosen employee as a string", async () => {
    serveOptions();
    const { user, onValueChange } = setup();
    await user.click(trigger());

    await user.click(await screen.findByRole("option", { name: "วิชัย มั่นคง" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("13");
  });

  it("reports an empty string when the dash option is chosen", async () => {
    serveOptions();
    const { user, onValueChange } = setup({ value: "12" });
    await user.click(trigger());

    await user.click(await screen.findByRole("option", { name: "---" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("");
  });

  it("filters the options by what is typed", async () => {
    serveOptions();
    const { user } = setup();
    await user.click(trigger());
    await screen.findByRole("option", { name: "วิชัย มั่นคง" });

    await user.type(screen.getByPlaceholderText("ค้นหาพนักงาน"), "สมหญิง");

    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    expect(screen.getByRole("option")).toHaveTextContent("สมหญิง รักงาน");
  });

  it("shows the no-results text when nothing matches", async () => {
    serveOptions();
    const { user } = setup();
    await user.click(trigger());
    await screen.findByRole("option", { name: "วิชัย มั่นคง" });

    await user.type(screen.getByPlaceholderText("ค้นหาพนักงาน"), "ไม่มีคนนี้");

    expect(await screen.findByText("ไม่พบพนักงานที่ค้นหา")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("offers just the dash option when there are no employees", async () => {
    const requests = serveOptions([]);
    const { user } = setup();
    await waitFor(() => expect(requests).toHaveBeenCalled());

    await user.click(trigger());

    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual(["---"]);
  });

  it("still offers the dash option when loading the options fails", async () => {
    server.use(http.get(OPTIONS_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = setup();

    await user.click(trigger());

    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual(["---"]);
  });

  it("marks the trigger invalid when ariaInvalid is set", () => {
    serveOptions();
    setup({ ariaInvalid: true });

    expect(trigger()).toHaveAttribute("aria-invalid", "true");
  });

  it("applies the custom className to the trigger", () => {
    serveOptions();
    setup({ className: "w-64" });

    expect(trigger()).toHaveClass("w-64");
  });
});
