import { cn } from "@/utils/cn";

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus:not-sr-only",
        "fixed top-4 left-4 z-[100] px-4 py-2",
        "bg-blue text-on-primary rounded-lg",
        "font-bold text-sm"
      )}
    >
      Skip to main content
    </a>
  );
}
