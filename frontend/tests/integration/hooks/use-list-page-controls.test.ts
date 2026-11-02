import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useListPageControls } from "@/hooks/use-list-page-controls";
import { router, setUrl } from "@/tests/mocks/next-navigation";

const SORT_BY = ["name", "budget"] as const;

function renderControls(url: string) {
  setUrl(url);
  return renderHook(() => useListPageControls({ sortByValues: SORT_BY }));
}

describe("useListPageControls — reading the URL", () => {
  it("uses defaults when the URL has no params", () => {
    const { result } = renderControls("/dashboard/tender-projects");

    expect(result.current).toMatchObject({ page: 1, pageSize: 20, sortBy: undefined, sorting: [] });
    expect(result.current.pagination).toEqual({ pageIndex: 0, pageSize: 20 });
  });

  it("reads page, page size and sort", () => {
    const { result } = renderControls("/x?page=3&per_page=50&sort_by=budget&sort_direction=asc");

    expect(result.current).toMatchObject({ page: 3, pageSize: 50, sortBy: "budget", sortDirection: "asc" });
    expect(result.current.sorting).toEqual([{ id: "budget", desc: false }]);
  });

  it.each(["0", "-2", "abc", "1.5"])("falls back to page 1 for page=%s", (page) => {
    expect(renderControls(`/x?page=${page}`).result.current.page).toBe(1);
  });

  it("ignores a sort column that is not allowed", () => {
    const { result } = renderControls("/x?sort_by=password&sort_direction=asc");

    expect(result.current.sortBy).toBeUndefined();
    expect(result.current.sortDirection).toBeUndefined();
  });

  it("defaults the sort direction to desc", () => {
    expect(renderControls("/x?sort_by=name").result.current.sortDirection).toBe("desc");
  });
});

describe("useListPageControls — writing the URL", () => {
  it("drops page 1 and the default page size from the URL", () => {
    const { result } = renderControls("/x?page=4");

    act(() => result.current.setPagination({ pageIndex: 0, pageSize: 20 }));

    expect(router.replace).toHaveBeenCalledWith("/x", { scroll: false });
  });

  it("writes page and page size", () => {
    const { result } = renderControls("/x");

    act(() => result.current.setPagination({ pageIndex: 2, pageSize: 50 }));

    expect(router.replace).toHaveBeenCalledWith("/x?page=3&per_page=50", { scroll: false });
  });

  it("writes the sort and resets to page 1", () => {
    const { result } = renderControls("/x?page=4");

    act(() => result.current.setSorting([{ id: "name", desc: false }]));

    expect(router.replace).toHaveBeenCalledWith("/x?sort_by=name&sort_direction=asc", { scroll: false });
  });

  it("clears the sort", () => {
    const { result } = renderControls("/x?sort_by=name&sort_direction=asc");

    act(() => result.current.setSorting([]));

    expect(router.replace).toHaveBeenCalledWith("/x", { scroll: false });
  });

  it("debounces the search before writing it", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderControls("/x?page=2");

      act(() => result.current.setSearch("  คอมพิวเตอร์ "));
      expect(router.replace).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(350));
      expect(router.replace).toHaveBeenCalledWith(
        `/x?search=${encodeURIComponent("คอมพิวเตอร์")}`,
        { scroll: false },
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
