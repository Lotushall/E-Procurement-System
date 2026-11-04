import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilePlus, Upload } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { FloatingActionButton } from "@/components/floating-action-button";

describe("FloatingActionButton", () => {
  it("renders nothing when there are no actions", () => {
    const { container } = render(<FloatingActionButton actions={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  describe("single action", () => {
    it("renders a button that runs onSelect immediately", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<FloatingActionButton actions={[{ label: "สร้าง TOR", icon: FilePlus, onSelect }]} />);

      const button = screen.getByRole("button", { name: "สร้าง TOR" });
      expect(button).toHaveAttribute("title", "สร้าง TOR");
      await user.click(button);

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("renders a link when the action has an href", () => {
      render(<FloatingActionButton actions={[{ label: "สร้าง TOR", icon: FilePlus, href: "/dashboard/tors/create" }]} />);

      // base-ui Button gives the rendered anchor a non-native button role
      const link = screen.getByRole("button", { name: "สร้าง TOR" });
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "/dashboard/tors/create");
    });
  });

  describe("speed dial", () => {
    const onSelect = vi.fn();
    const actions = [
      { label: "สร้าง TOR", icon: FilePlus, href: "/dashboard/tors/create" },
      { label: "นำเข้าไฟล์", icon: Upload, onSelect },
    ];

    it("shows only the main button, with the default menu label, until opened", () => {
      render(<FloatingActionButton actions={actions} />);

      expect(screen.getByRole("button", { name: "เมนูเพิ่มเติม" })).toBeInTheDocument();
      expect(screen.queryByText("สร้าง TOR")).not.toBeInTheDocument();
    });

    it("uses a custom menu label", () => {
      render(<FloatingActionButton actions={actions} menuLabel="เพิ่ม" />);

      expect(screen.getByRole("button", { name: "เพิ่ม" })).toBeInTheDocument();
    });

    it("opens the dial listing a link item and a button item", async () => {
      const user = userEvent.setup();
      render(<FloatingActionButton actions={actions} />);

      await user.click(screen.getByRole("button", { name: "เมนูเพิ่มเติม" }));

      const link = await screen.findByRole("menuitem", { name: "สร้าง TOR" });
      expect(link).toHaveAttribute("href", "/dashboard/tors/create");
      expect(screen.getByRole("menuitem", { name: "นำเข้าไฟล์" })).toBeInTheDocument();
    });

    it("runs onSelect and closes the dial when an item is chosen", async () => {
      const user = userEvent.setup();
      onSelect.mockClear();
      render(<FloatingActionButton actions={actions} />);

      await user.click(screen.getByRole("button", { name: "เมนูเพิ่มเติม" }));
      await user.click(await screen.findByRole("menuitem", { name: "นำเข้าไฟล์" }));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes the dial with Escape", async () => {
      const user = userEvent.setup();
      render(<FloatingActionButton actions={actions} />);

      await user.click(screen.getByRole("button", { name: "เมนูเพิ่มเติม" }));
      await screen.findByRole("menu");

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});
