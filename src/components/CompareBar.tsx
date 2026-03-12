"use client";

import Link from "next/link";
import { useComparison } from "@/hooks/useComparison";

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function CompareBar() {
  const { slugs, remove, clear } = useComparison();

  if (slugs.length === 0) return null;

  const compareUrl = `/compare?schools=${slugs.join(",")}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-mantle border-t border-surface0 shadow-2xl px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span className="text-subtext0 text-sm font-medium shrink-0">Compare:</span>
        {slugs.map((slug) => (
          <span
            key={slug}
            className="flex items-center gap-1 px-2 py-0.5 bg-surface0 rounded-full text-sm text-text"
          >
            <span className="max-w-[140px] truncate">{slugToName(slug)}</span>
            <button
              type="button"
              onClick={() => remove(slug)}
              aria-label={`Remove ${slugToName(slug)} from comparison`}
              className="text-subtext0 hover:text-red transition-colors ml-0.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={clear}
          className="text-sm text-subtext0 hover:text-text transition-colors"
        >
          Clear
        </button>
        <Link
          href={compareUrl}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Compare {slugs.length} school{slugs.length !== 1 ? "s" : ""}
        </Link>
      </div>
    </div>
  );
}
