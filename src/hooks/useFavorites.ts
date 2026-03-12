"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "cspathfinder-favorites";

function readFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const strings = parsed.filter((item): item is string => typeof item === "string");
      return new Set(strings);
    }
  } catch {
    // ignore
  }
  return new Set();
}

function writeToStorage(favorites: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {
    // ignore
  }
}

// Global state to sync across multiple hook usages
let globalFavorites: Set<string> | null = null;
const listeners = new Set<(favorites: Set<string>) => void>();

function getInitialFavorites() {
  if (globalFavorites === null) {
    globalFavorites = typeof window !== "undefined" ? readFromStorage() : new Set();
  }
  return globalFavorites;
}

function setGlobalFavorites(next: Set<string>) {
  globalFavorites = next;
  writeToStorage(next);
  listeners.forEach((l) => l(next));
}

/** Reset module-level state — for use in tests only. */
export function __resetForTesting() {
  globalFavorites = null;
  listeners.clear();
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const current = getInitialFavorites();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorites(current);

    listeners.add(setFavorites);
    return () => {
      listeners.delete(setFavorites);
    };
  }, []);

  const toggle = useCallback((slug: string) => {
    const prev = getInitialFavorites();
    const next = new Set(prev);
    if (next.has(slug)) {
      next.delete(slug);
    } else {
      next.add(slug);
    }
    setGlobalFavorites(next);
  }, []);

  const isFavorited = useCallback((slug: string) => favorites.has(slug), [favorites]);

  return { favorites, toggle, isFavorited, count: favorites.size };
}
