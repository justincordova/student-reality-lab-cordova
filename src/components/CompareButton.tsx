"use client";

import { useComparison } from "@/hooks/useComparison";
import { cn } from "@/utils/cn";

interface CompareButtonProps {
  slug: string;
  name: string;
}

export default function CompareButton({ slug, name }: CompareButtonProps) {
  const { toggle, isSelected, isFull } = useComparison();
  const selected = isSelected(slug);
  const disabled = !selected && isFull;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) toggle(slug);
      }}
      disabled={disabled}
      aria-label={selected ? `Remove ${name} from comparison` : `Add ${name} to comparison`}
      aria-pressed={selected}
      className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
        selected
          ? "bg-primary/20 text-primary border border-primary"
          : disabled
            ? "bg-surface0 text-subtext0 opacity-40 cursor-not-allowed"
            : "bg-surface0 hover:bg-surface1 text-text"
      )}
    >
      {selected ? "Added" : "+ Compare"}
    </button>
  );
}
