import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InternalProfileSelect } from "@/components/internal-profile-select";
import { makeAvailableInternalProfile } from "@/tests/fixtures/internal-profiles";

const PROFILES = [
  makeAvailableInternalProfile({ id: 11, name: "สมชาย ใจดี" }),
  makeAvailableInternalProfile({ id: 12, name: "สมหญิง รักงาน" }),
  makeAvailableInternalProfile({ id: 13, name: "วิชัย มั่นคง" }),
];

type Props = Partial<React.ComponentProps<typeof InternalProfileSelect>>;

function setup(props: Props = {}) {
  const onValueChange = vi.fn();
  const view = render(<InternalProfileSelect profiles={PROFILES} value="" onValueChange={onValueChange} {...props} />);
  return { onValueChange, user: userEvent.setup(), ...view };
}

const trigger = () => screen.getByRole("combobox");

describe("InternalProfileSelect", () => {
  it("shows the placeholder when no profile is chosen", () => {
    setup({ value: "" });

    expect(trigger()).toHaveTextContent("เลือกพนักงาน");
  });

  it("shows the placeholder when the value matches no profile", () => {
    setup({ value: "999" });

    expect(trigger()).toHaveTextContent("เลือกพนักงาน");
  });

  it("shows the name of the chosen profile", () => {
    setup({ value: "12" });

    expect(trigger()).toHaveTextContent("สมหญิง รักงาน");
  });

  it("lists every available profile and a search box when opened", async () => {
    const { user } = setup();

    await user.click(trigger());

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["สมชาย ใจดี", "สมหญิง รักงาน", "วิชัย มั่นคง"]);
    expect(screen.getByPlaceholderText("ค้นหาพนักงาน")).toBeInTheDocument();
  });

  it("reports the id of the chosen profile as a string", async () => {
    const { user, onValueChange } = setup();

    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "วิชัย มั่นคง" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("13");
  });

  it("filters the options by what is typed", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาพนักงาน"), "สมหญิง");

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["สมหญิง รักงาน"]);
  });

  it("shows the empty text when nothing matches", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาพนักงาน"), "ไม่มีคนนี้");

    expect(await screen.findByText("ไม่พบพนักงานที่ว่าง")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("shows the empty text straight away when no profile is available", async () => {
    const { user } = setup({ profiles: [] });

    await user.click(trigger());

    expect(await screen.findByText("ไม่พบพนักงานที่ว่าง")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("marks the trigger invalid when ariaInvalid is set", () => {
    setup({ ariaInvalid: true });

    expect(trigger()).toHaveAttribute("aria-invalid", "true");
  });

  it("applies the custom className to the trigger", () => {
    setup({ className: "w-64" });

    expect(trigger()).toHaveClass("w-64");
  });
});
