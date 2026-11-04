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

describe("useListPageControls — updateParams", () => {
  it("deletes params whose value is null or an empty string and keeps the rest", () => {
    const { result } = renderControls("/x?status=open&owner=7&page=3");

    act(() => result.current.updateParams({ status: null, owner: "", kind: "a", limit: 5 }));

    expect(router.replace).toHaveBeenCalledWith("/x?page=3&kind=a&limit=5", { scroll: false });
  });

  it("drops the page param when resetPage is true", () => {
    const { result } = renderControls("/x?page=3");

    act(() => result.current.updateParams({ status: "open" }, true));

    expect(router.replace).toHaveBeenCalledWith("/x?status=open", { scroll: false });
  });
});

describe("useListPageControls — per_page", () => {
  it("writes per_page only when it differs from a custom default", () => {
    setUrl("/x");
    const { result } = renderHook(() => useListPageControls({ sortByValues: SORT_BY, defaultPageSize: 10 }));

    act(() => result.current.setPagination({ pageIndex: 0, pageSize: 10 }));
    expect(router.replace).toHaveBeenLastCalledWith("/x", { scroll: false });

    act(() => result.current.setPagination({ pageIndex: 0, pageSize: 20 }));
    expect(router.replace).toHaveBeenLastCalledWith("/x?per_page=20", { scroll: false });
  });

  it("accepts an updater function for pagination", () => {
    const { result } = renderControls("/x?page=2");

    act(() => result.current.setPagination((old) => ({ ...old, pageIndex: old.pageIndex + 1 })));

    expect(router.replace).toHaveBeenCalledWith("/x?page=3", { scroll: false });
  });

  it("accepts an updater function for sorting and flips to descending", () => {
    const { result } = renderControls("/x?sort_by=name&sort_direction=asc");

    act(() => result.current.setSorting(() => [{ id: "budget", desc: true }]));

    expect(router.replace).toHaveBeenCalledWith("/x?sort_by=budget&sort_direction=desc", { scroll: false });
  });
});

describe("useListPageControls — search", () => {
  it("applies normalizeSearch to the trimmed text before writing it", () => {
    vi.useFakeTimers();
    try {
      setUrl("/x");
      const { result } = renderHook(() =>
        useListPageControls({ sortByValues: SORT_BY, normalizeSearch: (value) => value.toUpperCase() }),
      );

      act(() => result.current.setSearch("  tp-001 "));
      act(() => vi.advanceTimersByTime(350));

      expect(router.replace).toHaveBeenCalledWith("/x?search=TP-001", { scroll: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses a custom debounce delay", () => {
    vi.useFakeTimers();
    try {
      setUrl("/x");
      const { result } = renderHook(() => useListPageControls({ sortByValues: SORT_BY, searchDebounceMs: 100 }));

      act(() => result.current.setSearch("abc"));
      act(() => vi.advanceTimersByTime(99));
      expect(router.replace).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(1));
      expect(router.replace).toHaveBeenCalledWith("/x?search=abc", { scroll: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes the search param and the page when the input is cleared", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderControls("/x?search=abc&page=2");

      act(() => result.current.setSearch("   "));
      act(() => vi.advanceTimersByTime(350));

      expect(router.replace).toHaveBeenCalledWith("/x", { scroll: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not write the URL when the typed text already matches the URL", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderControls("/x?search=abc");

      act(() => result.current.setSearch(" abc "));
      act(() => vi.advanceTimersByTime(1000));

      expect(router.replace).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("resyncs the input when the search param changes from outside", () => {
    setUrl("/x?search=old");
    const { result, rerender } = renderHook(() => useListPageControls({ sortByValues: SORT_BY }));
    expect(result.current.search).toBe("old");

    setUrl("/x?search=new");
    rerender();

    expect(result.current.debouncedSearch).toBe("new");
    expect(result.current.search).toBe("new");
  });
});

describe("useListPageControls — resolveIsFetching", () => {
  it("never shows the skeleton for a fetch that was not triggered by search", () => {
    const { result } = renderControls("/x");

    expect(result.current.resolveIsFetching(false)).toBe(false);
    let shown = true;
    act(() => {
      shown = result.current.resolveIsFetching(true);
    });
    expect(shown).toBe(false);
  });

  it("shows the skeleton for fetches after setSkipSkeleton(false)", () => {
    const { result } = renderControls("/x");

    act(() => result.current.setSkipSkeleton(false));
    let shown = false;
    act(() => {
      shown = result.current.resolveIsFetching(true);
    });

    expect(shown).toBe(true);
  });

  it("is false when not fetching even if skeleton is enabled", () => {
    const { result } = renderControls("/x");

    act(() => result.current.setSkipSkeleton(false));

    expect(result.current.resolveIsFetching(false)).toBe(false);
  });

  it("resets to skipping the skeleton after the fetch ends", () => {
    const { result } = renderControls("/x");

    act(() => result.current.setSkipSkeleton(false));
    act(() => {
      result.current.resolveIsFetching(true);
    });
    expect(result.current.resolveIsFetching(true)).toBe(true);

    act(() => {
      result.current.resolveIsFetching(false);
    });
    let shown = true;
    act(() => {
      shown = result.current.resolveIsFetching(true);
    });

    expect(shown).toBe(false);
  });

  it("skips the skeleton again after paging or sorting", () => {
    const { result } = renderControls("/x");

    act(() => result.current.setSkipSkeleton(false));
    act(() => result.current.setPagination({ pageIndex: 1, pageSize: 20 }));

    expect(result.current.resolveIsFetching(true)).toBe(false);

    act(() => result.current.setSkipSkeleton(false));
    act(() => result.current.setSorting([{ id: "name", desc: true }]));

    expect(result.current.resolveIsFetching(true)).toBe(false);
  });
});
