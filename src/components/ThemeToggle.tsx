"use client";

import { useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"latte" | "mocha">(() => {
    if (typeof window === "undefined") return "latte";
    const current = document.documentElement.getAttribute("data-theme");
    return current === "mocha" ? "mocha" : "latte";
  });

  const toggle = () => {
    const next = theme === "latte" ? "mocha" : "latte";
    setTheme(next);
    if (next === "mocha") {
      document.documentElement.setAttribute("data-theme", "mocha");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("theme", next);
    } catch (err) {
      console.warn("Failed to persist theme to localStorage:", err);
    }
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-1.5 rounded-lg bg-surface0 text-text hover:bg-surface1 transition-colors text-sm font-medium flex items-center gap-1.5"
      aria-label={`Switch to ${theme === "latte" ? "dark" : "light"} theme`}
    >
      {theme === "latte" ? (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>{" "}
          Dark
        </>
      ) : (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>{" "}
          Light
        </>
      )}
    </button>
  );
}
