"use client";

import { useChatContext } from "./ChatProvider";
import { useCompareContext } from "./CompareProvider";

export default function ChatButton() {
  const { toggle, isOpen } = useChatContext();
  const { slugs } = useCompareContext();
  const compareBarVisible = slugs.length > 0;

  return (
    <button
      onClick={toggle}
      className={`fixed right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-pink text-on-primary shadow-lg shadow-primary/30 hover:scale-105 hover:shadow-primary/50 transition-all duration-200 flex items-center justify-center z-40 ${compareBarVisible ? "bottom-20" : "bottom-6"}`}
      aria-label={isOpen ? "Close chat" : "Open chat assistant"}
    >
      {isOpen ? (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  );
}
