"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "cspathfinder-compare";
const MAX_COMPARE = 3;

function readFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return (parsed as string[]).slice(0, MAX_COMPARE);
  } catch {
    // ignore
  }
  return [];
}

function writeToStorage(slugs: string[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // ignore
  }
}

export function useComparison() {
  const [slugs, setSlugs] = useState<string[]>(readFromStorage);

  const add = useCallback((slug: string) => {
    setSlugs((prev) => {
      if (prev.includes(slug) || prev.length >= MAX_COMPARE) return prev;
      const next = [...prev, slug];
      writeToStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = prev.filter((s) => s !== slug);
      writeToStorage(next);
      return next;
    });
  }, []);

  const toggle = useCallback((slug: string) => {
    setSlugs((prev) => {
      if (prev.includes(slug)) {
        const next = prev.filter((s) => s !== slug);
        writeToStorage(next);
        return next;
      }
      if (prev.length >= MAX_COMPARE) return prev;
      const next = [...prev, slug];
      writeToStorage(next);
      return next;
    });
  }, []);

  const isSelected = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const clear = useCallback(() => {
    setSlugs([]);
    writeToStorage([]);
  }, []);

  return {
    slugs,
    add,
    remove,
    toggle,
    isSelected,
    clear,
    isFull: slugs.length >= MAX_COMPARE,
  };
}
