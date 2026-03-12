"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { usePathname } from "next/navigation";
import { useFavorites } from "@/hooks/useFavorites";

export default function Navbar() {
  const pathname = usePathname();
  const { count } = useFavorites();

  return (
    <nav className="mx-auto max-w-[800px] mt-4 rounded-lg border border-surface0 bg-mantle px-8 shadow-sm">
      <div className="h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold text-primary transition-all duration-200 hover:scale-105 hover:drop-shadow-[0_0_14px_var(--ctp-primary)] hover:text-pink inline-block"
        >
          CSPathFinder
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/resources"
            className={`relative text-sm font-medium transition-colors after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100 ${
              pathname === "/resources" ? "text-primary after:scale-x-100" : "text-text"
            }`}
          >
            Resources
          </Link>
          <Link
            href="/favorites"
            className="relative text-subtext0 hover:text-red transition-colors"
            aria-label={`Favorites${count > 0 ? ` (${count})` : ""}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={pathname === "/favorites" ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={pathname === "/favorites" ? "text-red" : ""}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
