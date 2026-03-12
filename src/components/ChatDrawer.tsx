"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ChatFiltersSchema } from "@/lib/data/schema";
import { useChatContext, type ChatFilters } from "./ChatProvider";
import { useCompareContext } from "./CompareProvider";

const FILTER_REGEX = /```filter\n([\s\S]*?)\n```/;
const SUGGESTIONS_REGEX = /```suggestions\n([\s\S]*?)\n```/;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  filters?: ChatFilters;
  suggestions?: string[];
}

function parseBlocks(text: string): {
  cleanText: string;
  filters: ChatFilters | null;
  suggestions: string[];
} {
  if (typeof text !== "string") return { cleanText: "", filters: null, suggestions: [] };

  let cleanText = text;
  let filters: ChatFilters | null = null;
  let suggestions: string[] = [];

  const filterMatch = cleanText.match(FILTER_REGEX);
  if (filterMatch) {
    try {
      const parsed = ChatFiltersSchema.safeParse(JSON.parse(filterMatch[1]));
      if (parsed.success) {
        filters = parsed.data;
      }
    } catch {
      // ignore parse errors
    }
    cleanText = cleanText.replace(FILTER_REGEX, "").trim();
  }

  const suggestionsMatch = cleanText.match(SUGGESTIONS_REGEX);
  if (suggestionsMatch) {
    try {
      const parsed = JSON.parse(suggestionsMatch[1]);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
        suggestions = parsed.slice(0, 3);
      }
    } catch {
      // ignore parse errors
    }
    cleanText = cleanText.replace(SUGGESTIONS_REGEX, "").trim();
  }

  return { cleanText, filters, suggestions };
}

export default function ChatDrawer() {
  const { isOpen, close, applyFilters, schoolContext } = useChatContext();
  const { add: addToCompare } = useCompareContext();
  const router = useRouter();
  const pathname = usePathname();
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setHasBeenOpened(true);
  }, [isOpen]);

  // Move focus into the drawer when it opens for keyboard/screen reader accessibility
  useEffect(() => {
    if (!isOpen) return;
    // Wait for the drawer to be rendered and the CSS transition to begin
    const id = setTimeout(() => {
      const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }, 50);
    return () => clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        document.body.style.overflow = "hidden";
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
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
  const nextIdRef = useRef(0);
  const newMsgId = () => String(nextIdRef.current++);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const userMsg: Message = { id: newMsgId(), role: "user", content: text };
    const newMessages = [...messagesRef.current, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);
    abortControllerRef.current = abortController;

    try {
      let messagesToSend = newMessages.slice(-20);
      if (schoolContext && newMessages.length === 1) {
        const contextMsg = {
          id: String(nextIdRef.current++),
          role: "user" as const,
          content: `I'm looking at ${schoolContext}'s profile.`,
        };
        messagesToSend = [contextMsg, ...messagesToSend];
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToSend.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);

      let data: { reply?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        setMessages([
          ...newMessages,
          { id: newMsgId(), role: "assistant", content: "Server error. Please try again." },
        ]);
        return;
      }

      if (!res.ok || data.error) {
        const errMsg = data.error ?? `Request failed (${res.status})`;
        setMessages([
          ...newMessages,
          { id: newMsgId(), role: "assistant", content: `Error: ${errMsg}` },
        ]);
      } else {
        const replyText = data.reply ?? "";
        if (typeof replyText !== "string") {
          throw new Error("Invalid response format");
        }
        const { cleanText, filters, suggestions } = parseBlocks(replyText);
        const assistantMsg: Message = {
          id: newMsgId(),
          role: "assistant",
          content: cleanText,
          filters: filters ?? undefined,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        };
        setMessages([...newMessages, assistantMsg]);

        if (filters) {
          applyFilters(filters);
          if (filters.compare && filters.compare.length > 0) {
            for (const { slug, name } of filters.compare) {
              addToCompare(slug, name);
            }
          }
          if (pathname !== "/") {
            const params = new URLSearchParams();
            if (filters.sortBy) params.set("sort", filters.sortBy);
            if (filters.sortDir) params.set("dir", filters.sortDir);
            if (filters.state) params.set("state", filters.state);
            if (filters.region) params.set("region", filters.region);
            if (filters.search) params.set("q", filters.search);
            if (filters.rankSource) params.set("rank", filters.rankSource);
            router.push(`/?${params.toString()}`);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setMessages([
            ...newMessages,
            { id: newMsgId(), role: "assistant", content: "Request timed out. Please try again." },
          ]);
          return;
        }
        if (err.name === "TypeError" && err.message.includes("fetch")) {
          setMessages([
            ...newMessages,
            { id: newMsgId(), role: "assistant", content: "Failed to connect. Please try again." },
          ]);
          return;
        }
      }
      setMessages([
        ...newMessages,
        { id: newMsgId(), role: "assistant", content: "An error occurred. Please try again." },
      ]);
    } finally {
      clearTimeout(timeoutId);
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
              className="fixed inset-0 bg-crust/50 z-40 md:hidden"
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
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-surface1" />
            </div>
            <div className="flex items-center justify-between p-4 border-b border-surface0">
              <h2 className="font-bold text-lg">CSPathFinder AI</h2>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="text-xs text-subtext0 hover:text-red transition-colors"
                    aria-label="Clear chat history"
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
                  {schoolContext ? (
                    <p className="font-bold text-text">
                      I can see you&apos;re viewing <strong>{schoolContext}</strong>. Ask me
                      anything about it or compare it with other schools.
                    </p>
                  ) : (
                    <p className="font-bold">Ask me anything about CS programs</p>
                  )}
                  <div className="space-y-2 text-sm">
                    {[
                      "Best CS school for food?",
                      "Cheapest top 20 CS programs?",
                      "Best ROI in the Northeast?",
                      "Compare MIT and Stanford",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        className="block w-full text-left cursor-pointer hover:text-primary transition-colors px-3 py-1.5 rounded hover:bg-surface0"
                        onClick={() => sendMessage(suggestion)}
                      >
                        &quot;{suggestion}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const lastAssistantId = [...messages]
                  .reverse()
                  .find((m) => m.role === "assistant")?.id;
                return messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                        msg.role === "user" ? "bg-primary text-on-primary" : "bg-surface0 text-text"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            strong: ({ children }) => (
                              <strong className="font-semibold">{children}</strong>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>
                            ),
                            li: ({ children, ...props }) => <li {...props}>{children}</li>,
                            a: ({ href, children }) => {
                              if (!href || typeof href !== "string") {
                                return <span>{children}</span>;
                              }
                              if (!href.startsWith("http://") && !href.startsWith("https://")) {
                                return <span>{children}</span>;
                              }
                              try {
                                const url = new URL(href);
                                if (url.protocol !== "http:" && url.protocol !== "https:") {
                                  return <span>{children}</span>;
                                }
                              } catch {
                                return <span>{children}</span>;
                              }
                              return (
                                <a
                                  href={href}
                                  className="underline opacity-80"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                      {msg.filters && (
                        <div
                          className="mt-2 text-xs bg-crust/50 rounded px-2 py-1 text-subtext0"
                          aria-live="polite"
                        >
                          Filters applied to list ✓
                        </div>
                      )}
                    </div>
                    {msg.role === "assistant" &&
                      msg.id === lastAssistantId &&
                      msg.suggestions &&
                      msg.suggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                          {msg.suggestions.map((s) => (
                            <button
                              key={s}
                              onClick={() => sendMessage(s)}
                              disabled={loading}
                              className="text-xs px-2.5 py-1 rounded-full bg-surface0 hover:bg-surface1 text-subtext0 hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ));
              })()}

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
                  onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask about CS programs..."
                  aria-label="Chat message input"
                  maxLength={2000}
                  className="flex-1 px-3 py-2 bg-base border border-surface0 rounded-lg text-sm text-text placeholder:text-overlay0 focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
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
