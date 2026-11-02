import { beforeEach, describe, expect, it } from "vitest";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";

describe("useBreadcrumbStore", () => {
  beforeEach(() => {
    useBreadcrumbStore.setState({ items: [] });
  });

  it("starts empty", () => {
    expect(useBreadcrumbStore.getState().items).toEqual([]);
  });

  it("replaces the items", () => {
    const { setItems } = useBreadcrumbStore.getState();

    setItems([{ label: "โครงการ", href: "/dashboard/tender-projects" }]);
    setItems([{ label: "TOR", href: "/dashboard/tors" }, { loading: true }]);

    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "TOR", href: "/dashboard/tors" },
      { loading: true },
    ]);
  });

  it("clears the items", () => {
    useBreadcrumbStore.getState().setItems([{ label: "TOR" }]);
    useBreadcrumbStore.getState().clear();

    expect(useBreadcrumbStore.getState().items).toEqual([]);
  });
});
