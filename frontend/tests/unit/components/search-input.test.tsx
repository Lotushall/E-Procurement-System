import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "@/components/search-input";

describe("SearchInput", () => {
  it("reports each keystroke", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SearchInput value="" onValueChange={onValueChange} placeholder="ค้นหา" />);

    await user.type(screen.getByPlaceholderText("ค้นหา"), "ab");

    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenNthCalledWith(1, "a");
    expect(onValueChange).toHaveBeenNthCalledWith(2, "b");
  });

  it("hides the clear button when empty", () => {
    render(<SearchInput value="" onValueChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "ล้างคำค้นหา" })).not.toBeInTheDocument();
  });

  it("clears the value when the clear button is clicked", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SearchInput value="TOR" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));

    expect(onValueChange).toHaveBeenCalledWith("");
  });
});
