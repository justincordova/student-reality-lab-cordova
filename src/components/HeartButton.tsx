"use client";

import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/utils/cn";
import { useState, useRef, useEffect } from "react";

interface HeartButtonProps {
  slug: string;
  size?: "sm" | "md";
}

export default function HeartButton({ slug, size = "sm" }: HeartButtonProps) {
  const { toggle, isFavorited } = useFavorites();
  const favorited = isFavorited(slug);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dim = size === "md" ? 22 : 18;

  useEffect(() => {
    return () => {
      if (animationTimerRef.current !== null) clearTimeout(animationTimerRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (animationTimerRef.current !== null) clearTimeout(animationTimerRef.current);
    setIsAnimating(true);
    toggle(slug);
    animationTimerRef.current = setTimeout(() => setIsAnimating(false), 150);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorited}
      className={cn(
        "transform transition-all duration-100 ease-in-out",
        "hover:scale-110 active:scale-95",
        isAnimating && "scale-125",
        favorited ? "text-red" : "text-subtext0 hover:text-red"
      )}
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
        className="transition-all duration-200 ease-out"
        style={favorited ? { animation: "heartPop 0.3s ease-out" } : undefined}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <style jsx>{`
        @keyframes heartPop {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </button>
  );
}
