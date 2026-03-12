import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import CompareProvider, { useCompareContext } from "@/components/CompareProvider";

const STORAGE_KEY = "cspathfinder-compare";

function wrapper({ children }: { children: ReactNode }) {
  return <CompareProvider>{children}</CompareProvider>;
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("CompareProvider", () => {
  it("starts with no selections", () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    expect(result.current.slugs).toHaveLength(0);
    expect(result.current.isFull).toBe(false);
  });

  it("add puts a slug into slugs and names", () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.add("mit", "MIT");
    });
    expect(result.current.slugs).toContain("mit");
    expect(result.current.names["mit"]).toBe("MIT");
  });

  it("add is a no-op for duplicate slugs", () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.add("mit", "MIT");
      result.current.add("mit", "MIT again");
    });
    expect(result.current.slugs).toHaveLength(1);
  });

  it("add is a no-op when already at MAX_COMPARE (3)", () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.add("a", "A");
      result.current.add("b", "B");
      result.current.add("c", "C");
      result.current.add("d", "D");
    });
    expect(result.current.slugs).toHaveLength(3);
    expect(result.current.isFull).toBe(true);
  });

  it("remove drops the slug", () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.add("mit", "MIT");
      result.current.remove("mit");
    });
    expect(result.current.slugs).not.toContain("mit");
  });

  it("toggle adds when absent and removes when present", () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.toggle("mit", "MIT");
    });
    expect(result.current.isSelected("mit")).toBe(true);
    act(() => {
      result.current.toggle("mit", "MIT");
    });
    expect(result.current.isSelected("mit")).toBe(false);
  });

  it("clear empties all selections", () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.add("a", "A");
      result.current.add("b", "B");
      result.current.clear();
    });
    expect(result.current.slugs).toHaveLength(0);
  });

  it("persists selections to sessionStorage", () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    act(() => {
      result.current.add("stanford", "Stanford");
    });
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toEqual(expect.arrayContaining([{ slug: "stanford", name: "Stanford" }]));
  });

  it("hydrates from sessionStorage on mount", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { slug: "cmu", name: "Carnegie Mellon" },
        { slug: "caltech", name: "Caltech" },
      ])
    );
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    // useEffect runs after mount; wait for it
    await act(async () => {});
    expect(result.current.slugs).toContain("cmu");
    expect(result.current.slugs).toContain("caltech");
    expect(result.current.names["cmu"]).toBe("Carnegie Mellon");
  });

  it("hydrates from legacy string[] sessionStorage format", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(["berkeley", "ucla"]));
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    await act(async () => {});
    expect(result.current.slugs).toContain("berkeley");
    expect(result.current.slugs).toContain("ucla");
    // name falls back to slug for legacy format
    expect(result.current.names["berkeley"]).toBe("berkeley");
  });

  it("caps hydrated entries at MAX_COMPARE (3)", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { slug: "a", name: "A" },
        { slug: "b", name: "B" },
        { slug: "c", name: "C" },
        { slug: "d", name: "D" },
      ])
    );
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    await act(async () => {});
    expect(result.current.slugs).toHaveLength(3);
  });

  it("handles malformed sessionStorage gracefully", async () => {
    sessionStorage.setItem(STORAGE_KEY, "not-json{{");
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    await act(async () => {});
    expect(result.current.slugs).toHaveLength(0);
  });

  it("isSelected returns false for unknown slug", () => {
    const { result } = renderHook(() => useCompareContext(), { wrapper });
    expect(result.current.isSelected("unknown")).toBe(false);
  });
});
