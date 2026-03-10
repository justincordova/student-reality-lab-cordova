"use client";

import { useChatContext } from "./ChatProvider";

export default function ChatButton() {
  const { toggle, isOpen } = useChatContext();

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue text-on-primary shadow-lg hover:opacity-90 transition-all flex items-center justify-center z-40"
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
