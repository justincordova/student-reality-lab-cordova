"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

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
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
