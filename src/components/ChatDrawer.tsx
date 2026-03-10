"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { z } from "zod/v4";
import { useChatContext, type ChatFilters } from "./ChatProvider";

const ChatFiltersSchema = z.object({
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  state: z.string().optional(),
  region: z.string().optional(),
  search: z.string().optional(),
});

const FILTER_REGEX = /```filter\n([\s\S]*?)\n```/;

interface Message {
  role: "user" | "assistant";
  content: string;
  filters?: ChatFilters;
}

function parseFilterBlock(text: string): { cleanText: string; filters: ChatFilters | null } {
  const match = text.match(FILTER_REGEX);
  if (!match) return { cleanText: text, filters: null };

  try {
    const parsed = ChatFiltersSchema.safeParse(JSON.parse(match[1]));
    if (!parsed.success) return { cleanText: text, filters: null };
    const cleanText = text.replace(FILTER_REGEX, "").trim();
    return { cleanText, filters: parsed.data };
  } catch {
    return { cleanText: text, filters: null };
  }
}

export default function ChatDrawer() {
  const { isOpen, close, applyFilters } = useChatContext();
  const router = useRouter();
  const pathname = usePathname();
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setHasBeenOpened(true);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) close();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, close]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusableElements = drawerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingDots, setTypingDots] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading) {
      setTypingDots(0);
      return;
    }
    const interval = setInterval(() => setTypingDots((prev) => (prev + 1) % 4), 400);
    return () => clearInterval(interval);
  }, [loading]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messagesRef.current, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortController.signal,
      });

      const data = await res.json();

      if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        const { cleanText, filters } = parseFilterBlock(data.reply);
        const assistantMsg: Message = {
          role: "assistant",
          content: cleanText,
          filters: filters ?? undefined,
        };
        setMessages([...newMessages, assistantMsg]);

        if (filters) {
          applyFilters(filters);
          if (pathname !== "/") {
            const params = new URLSearchParams();
            if (filters.sortBy) params.set("sort", filters.sortBy);
            if (filters.sortDir) params.set("dir", filters.sortDir);
            if (filters.state) params.set("state", filters.state);
            if (filters.region) params.set("region", filters.region);
            if (filters.search) params.set("q", filters.search);
            router.push(`/?${params.toString()}`);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Failed to connect. Please try again." },
      ]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <>
      {!hasBeenOpened ? null : (
        <>
          {isOpen && (
            <div
              className="fixed inset-0 bg-crust/50 z-40 sm:hidden"
              onClick={close}
              aria-hidden="true"
            />
          )}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Chat assistant"
            className={`fixed top-0 right-0 h-full w-[380px] sm:w-[420px] max-w-[95vw] sm:max-w-[90vw] bg-mantle border-l border-surface0 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-surface0">
              <h2 className="font-bold text-lg">CSPathFinder AI</h2>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="text-xs text-subtext0 hover:text-red transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={close}
                  className="text-subtext0 hover:text-text"
                  aria-label="Close chat"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-subtext0 py-8 space-y-3">
                  <p className="font-bold">Ask me anything about CS programs</p>
                  <div className="space-y-2 text-sm">
                    {[
                      "Best CS school for food?",
                      "Cheapest top 20 CS programs?",
                      "Best ROI in the Northeast?",
                      "Compare MIT and Stanford",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        className="block w-full text-left cursor-pointer hover:text-blue transition-colors px-3 py-1.5 rounded hover:bg-surface0"
                        onClick={() => sendMessage(suggestion)}
                      >
                        &quot;{suggestion}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                      msg.role === "user" ? "bg-blue text-on-primary" : "bg-surface0 text-text"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.filters && (
                      <div
                        className="mt-2 text-xs bg-crust/50 rounded px-2 py-1 text-subtext0"
                        aria-live="polite"
                      >
                        Filters applied to list ✓
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-surface0 px-3 py-2 rounded-lg text-sm">
                    <p className="text-subtext0">Typing{".".repeat(typingDots || 1)}</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-surface0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask about CS programs..."
                  aria-label="Chat message input"
                  className="flex-1 px-3 py-2 bg-base border border-surface0 rounded-lg text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-blue"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 bg-blue text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
