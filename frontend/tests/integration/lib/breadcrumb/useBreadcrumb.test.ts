import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useBreadcrumbStore, type BreadcrumbItem } from "@/lib/breadcrumb/store";

const initialState = useBreadcrumbStore.getState();

afterEach(() => {
  useBreadcrumbStore.setState(initialState, true);
});

describe("useBreadcrumb", () => {
  it("sets the store on mount", () => {
    const items = [{ label: "หน้าแรก", href: "/" }, { label: "TOR" }];

    renderHook(() => useBreadcrumb(items));

    expect(useBreadcrumbStore.getState().items).toEqual(items);
  });

  it("clears the store on unmount", () => {
    const { unmount } = renderHook(() => useBreadcrumb([{ label: "TOR" }]));

    unmount();

    expect(useBreadcrumbStore.getState().items).toEqual([]);
  });

  it("does not touch the store when re-rendered with equal items", () => {
    const { rerender } = renderHook(({ items }) => useBreadcrumb(items), {
      initialProps: { items: [{ label: "TOR" }] as BreadcrumbItem[] },
    });
    const setItems = vi.fn();
    const clear = vi.fn();
    useBreadcrumbStore.setState({ setItems, clear });

    rerender({ items: [{ label: "TOR" }] });

    expect(setItems).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(useBreadcrumbStore.getState().items).toEqual([{ label: "TOR" }]);
  });

  it("updates the store when the items change", () => {
    const { rerender } = renderHook(({ items }) => useBreadcrumb(items), {
      initialProps: { items: [{ label: "TOR", loading: true }] as BreadcrumbItem[] },
    });
    expect(useBreadcrumbStore.getState().items).toEqual([{ label: "TOR", loading: true }]);

    rerender({ items: [{ label: "TOR-001" }] });

    expect(useBreadcrumbStore.getState().items).toEqual([{ label: "TOR-001" }]);
  });
});
