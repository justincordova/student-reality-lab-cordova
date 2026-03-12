"use client";

import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/utils/cn";

interface HeartButtonProps {
  slug: string;
  size?: "sm" | "md";
}

export default function HeartButton({ slug, size = "sm" }: HeartButtonProps) {
  const { toggle, isFavorited } = useFavorites();
  const favorited = isFavorited(slug);
  const dim = size === "md" ? 22 : 18;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorited}
      className={cn("transition-colors", favorited ? "text-red" : "text-subtext0 hover:text-red")}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
