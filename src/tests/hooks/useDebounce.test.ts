import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update before the delay elapses", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "initial" },
    });
    rerender({ value: "updated" });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("initial");
  });

  it("updates after the delay elapses", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "initial" },
    });
    rerender({ value: "updated" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("updated");
  });

  it("debounces multiple rapid updates and only applies the last one", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });
    rerender({ value: "b" });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: "c" });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: "d" });
    act(() => vi.advanceTimersByTime(100));
    // Still within debounce window of last update — should still be "a"
    expect(result.current).toBe("a");
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("d");
  });

  it("uses default delay of 300ms when none provided", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "initial" },
    });
    rerender({ value: "updated" });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("initial");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("updated");
  });

  it("clamps delay to 0 for negative values", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, -100), {
      initialProps: { value: "initial" },
    });
    rerender({ value: "updated" });
    act(() => vi.advanceTimersByTime(0));
    expect(result.current).toBe("updated");
  });

  it("works with non-string types", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 1 },
    });
    rerender({ value: 42 });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(42);
  });
});
