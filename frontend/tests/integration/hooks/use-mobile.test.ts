import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "@/hooks/use-mobile";

const originalMatchMedia = window.matchMedia;
const originalInnerWidth = window.innerWidth;

function setWidth(value: number) {
  Object.defineProperty(window, "innerWidth", { value, configurable: true, writable: true });
}

let listener: ((e: MediaQueryListEvent) => void) | undefined;
const addEventListener = vi.fn((_type: string, fn: (e: MediaQueryListEvent) => void) => {
  listener = fn;
});
const removeEventListener = vi.fn();
const matchMedia = vi.fn((query: string) => ({ matches: false, media: query, addEventListener, removeEventListener }));

beforeEach(() => {
  listener = undefined;
  addEventListener.mockClear();
  removeEventListener.mockClear();
  matchMedia.mockClear();
  window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  setWidth(originalInnerWidth);
});

describe("useIsMobile", () => {
  it("is true when the window is narrower than 768px", () => {
    setWidth(767);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
  });

  it("is false at exactly 768px", () => {
    setWidth(768);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });

  it("subscribes to the max-width: 767px media query", () => {
    setWidth(1024);
    renderHook(() => useIsMobile());

    expect(matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("updates when the media query changes", () => {
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => listener!({ matches: true } as MediaQueryListEvent));
    expect(result.current).toBe(true);

    act(() => listener!({ matches: false } as MediaQueryListEvent));
    expect(result.current).toBe(false);
  });

  it("removes the same listener on unmount", () => {
    setWidth(1024);
    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("change", listener);
  });
});
