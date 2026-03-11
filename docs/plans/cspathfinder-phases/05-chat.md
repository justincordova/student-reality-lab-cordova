# Phase 5: Chat & Accessibility (Tasks 8, 8.5)

> See [00-overview.md](./00-overview.md) for architecture, tech stack, and shared context.

## Task 8: Chat Drawer + API Route

This is the most complex task. The chat drawer is a slide-out panel accessible from any page via a floating icon. The AI can:

1. Answer natural-language questions about the school data
2. Return structured filter commands that auto-apply to the school list
3. For questions outside our data, suggest a web search or link

**Files:**

- Create: `src/app/api/chat/route.ts`
- Create: `src/components/ChatDrawer.tsx` (client component)
- Create: `src/components/ChatButton.tsx` (client component — floating icon)
- Create: `src/components/ChatProvider.tsx` (client component — context for filter communication)
- Modify: `src/app/layout.tsx` (add ChatProvider + ChatButton + ChatDrawer)
- Create: `.env.example`

**Step 1: Create ChatProvider context**

Create `src/components/ChatProvider.tsx`:

```typescript
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface ChatFilters {
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  state?: string;
  region?: string;
  search?: string;
}

interface ChatContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  pendingFilters: ChatFilters | null;
  applyFilters: (filters: ChatFilters) => void;
  clearPendingFilters: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}

export default function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<ChatFilters | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const applyFilters = useCallback((filters: ChatFilters) => setPendingFilters(filters), []);
  const clearPendingFilters = useCallback(() => setPendingFilters(null), []);

  return (
    <ChatContext.Provider value={{ isOpen, open, close, toggle, pendingFilters, applyFilters, clearPendingFilters }}>
      {children}
    </ChatContext.Provider>
  );
}
```

**Step 2: Create the chat API route**

Create `src/app/api/chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import { z } from "zod/v4";
import {
  childLogger,
  logError,
  checkRateLimit,
  withHttpLogging,
  ApiError,
  handleApiError,
} from "@/lib";
import { loadSchools } from "@/lib/data/loadSchools";
import { env } from "@/lib/env";

const log = childLogger("chat");

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: env.HF_TOKEN ?? "",
});

const MODEL = "mistralai/Mistral-Small-24B-Instruct-2501";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
});

let cachedSystemPrompt: string | null = null;

function buildSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  const schools = loadSchools();
  // Limit to top 30 schools to avoid token overflow (5000+ tokens for 100 schools)
  // For queries about other schools, the AI can still provide filter commands
  const schoolsForPrompt = schools.slice(0, 30);
  const dataStr = schoolsForPrompt
    .map(
      (s) =>
        `${s.name} | ${s.city}, ${s.state} | ${s.region} | Rank #${s.ranking} | In-state: $${s.tuitionInState} | Out-of-state: $${s.tuitionOutOfState} | R&B: $${s.roomAndBoard} | Earnings: ${s.medianEarnings6yr ? "$" + s.medianEarnings6yr : "N/A"} | Debt: ${s.medianDebt ? "$" + s.medianDebt : "N/A"} | Accept: ${(s.acceptanceRate * 100).toFixed(1)}% | Grad: ${(s.graduationRate * 100).toFixed(1)}% | Niche: Overall=${s.nicheGrades.overall} Academics=${s.nicheGrades.academics} Food=${s.nicheGrades.campusFood} Party=${s.nicheGrades.partyScene} Social=${s.nicheGrades.studentLife} Dorms=${s.nicheGrades.dorms} Safety=${s.nicheGrades.safety} Profs=${s.nicheGrades.professors} Athletics=${s.nicheGrades.athletics} Diversity=${s.nicheGrades.diversity} Value=${s.nicheGrades.value} Location=${s.nicheGrades.location}`
    )
    .join("\n");

  const prompt = `You are CSPathFinder AI, an assistant that helps students find Computer Science programs at US colleges. You have data on ${schools.length} CS programs.

IMPORTANT: When the user asks a question that can be answered by sorting/filtering the school list, include a JSON filter block in your response like this:
\`\`\`filter
{"sortBy": "campusFood", "sortDir": "desc"}
\`\`\`

Available sortBy values: ranking, roi, tuitionInState, tuitionOutOfState, medianEarnings6yr, medianDebt, acceptanceRate, graduationRate, enrollment, overall, academics, value, diversity, campus, athletics, partyScene, professors, location, dorms, campusFood, studentLife, safety
Available filter fields: state (e.g. "CA" or "NJ,NY"), region (e.g. "Northeast"), search (text match on name/city)

Examples:
- "Best food" → answer + \`\`\`filter\n{"sortBy": "campusFood", "sortDir": "desc"}\n\`\`\`
- "Cheapest in California" → answer + \`\`\`filter\n{"sortBy": "tuitionInState", "sortDir": "asc", "state": "CA"}\n\`\`\`
- "Best ROI in the Northeast" → answer + \`\`\`filter\n{"sortBy": "roi", "sortDir": "desc", "region": "Northeast"}\n\`\`\`

NOTE: The data above shows the top 30 schools for brevity. The app has data on all ${schools.length} schools. If the user asks about a school ranked 31-100, use a filter command to help them find it (e.g. \`\`\`filter\n{"search": "school name"}\n\`\`\`) rather than guessing its stats.

If the user asks about something we do NOT have data for (e.g. "most asian students", "best cafeteria dish", "dorm room sizes"), say you don't have that specific data and suggest they check Niche.com or College Scorecard for more details. Do NOT make up data.

Be concise and helpful. Always answer the question first, then include the filter block if applicable.

Here is the data:
${dataStr}`;

  cachedSystemPrompt = prompt;
  return prompt;
}

export async function POST(req: NextRequest) {
  return withHttpLogging(req, async () => {
    // CSRF protection: verify request originates from our own site
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      throw new ApiError(403, "Forbidden");
    }

    // Rate limiting — 10 requests per minute per IP
    const rateLimitResponse = await checkRateLimit(req, {
      id: "api/chat",
      limit: 10,
      windowSecs: 60,
    });
    if (rateLimitResponse) return rateLimitResponse;

    if (!env.HF_TOKEN) {
      throw new ApiError(503, "Chat service not configured");
    }

    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid request format");
    }

    const { messages } = parsed.data;
    const systemPrompt = buildSystemPrompt();
    log.debug("Sending chat request", { messageCount: messages.length, model: MODEL });

    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 1024,
      });

      const reply =
        completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
      log.info("Chat response generated", { model: MODEL, tokens: completion.usage?.total_tokens });
      return NextResponse.json({ reply });
    } catch (err) {
      logError("HF API error", err, { model: MODEL });
      throw new ApiError(502, "Failed to get a response. Please try again.");
    }
  }).catch(handleApiError);
}
```

**Step 3: Create ChatButton (floating icon)**

Create `src/components/ChatButton.tsx`:

```typescript
'use client';

import { useChatContext } from './ChatProvider';

export default function ChatButton() {
  const { toggle, isOpen } = useChatContext();

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue text-on-primary shadow-lg hover:opacity-90 transition-all flex items-center justify-center z-40"
      aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
    >
      {isOpen ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  );
}
```

**Step 4: Create ChatDrawer (slide-out panel)**

Create `src/components/ChatDrawer.tsx`:

````typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useChatContext, type ChatFilters } from './ChatProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  filters?: ChatFilters;
}

function parseFilterBlock(text: string): { cleanText: string; filters: ChatFilters | null } {
  const filterRegex = /```filter\n([\s\S]*?)\n```/;
  const match = text.match(filterRegex);
  if (!match) return { cleanText: text, filters: null };

  try {
    const filters = JSON.parse(match[1]) as ChatFilters;
    const cleanText = text.replace(filterRegex, '').trim();
    return { cleanText, filters };
  } catch {
    return { cleanText: text, filters: null };
  }
}

const CHAT_STORAGE_KEY = 'cspathfinder-chat-history';
const MAX_CHAT_HISTORY = 20;

function loadChatHistory(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveChatHistory(messages: Message[]) {
  try {
    // Limit to last MAX_CHAT_HISTORY messages to prevent overflow
    const limitedMessages = messages.slice(-MAX_CHAT_HISTORY);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(limitedMessages));
  } catch (err) {
    // localStorage full or unavailable — silently ignore
    console.warn('Failed to save chat history:', err);
  }
}

export default function ChatDrawer() {
  const { isOpen, close, applyFilters } = useChatContext();
  const router = useRouter();
  const pathname = usePathname();
  // Track if drawer has ever been opened so we don't unmount during close animation
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  useEffect(() => { if (isOpen) setHasBeenOpened(true); }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  const [messages, setMessages] = useState<Message[]>(() => loadChatHistory());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingDots, setTypingDots] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Ref to avoid stale closure in sendMessage (messages state may be stale in callbacks)
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Persist chat history to localStorage
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing animation for loading state
  useEffect(() => {
    if (!loading) {
      setTypingDots(0);
      return;
    }

    const interval = setInterval(() => {
      setTypingDots((prev) => (prev + 1) % 4);
    }, 400);

    return () => clearInterval(interval);
  }, [loading]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messagesRef.current, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(-MAX_CHAT_HISTORY).map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortController.signal,
      });

      const data = await res.json();

      if (data.error) {
        setMessages([...newMessages, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        const { cleanText, filters } = parseFilterBlock(data.reply);
        const assistantMsg: Message = { role: 'assistant', content: cleanText, filters };
        setMessages([...newMessages, assistantMsg]);

        // Auto-apply filters if AI returned them
        if (filters) {
          applyFilters(filters);
          // If not on home page, navigate there so user can see the filtered list
          if (pathname !== '/') {
            const params = new URLSearchParams();
            if (filters.sortBy) params.set('sort', filters.sortBy);
            if (filters.sortDir) params.set('dir', filters.sortDir);
            if (filters.state) params.set('state', filters.state);
            if (filters.region) params.set('region', filters.region);
            if (filters.search) params.set('q', filters.search);
            router.push(`/?${params.toString()}`);
          }
        }
      }
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setMessages([...newMessages, { role: 'assistant', content: 'Failed to connect. Please try again.' }]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <>
      {/* Only render drawer DOM after first open (avoids heavy DOM when never used) */}
      {!hasBeenOpened ? null : (<>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-crust/50 z-40 sm:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
    <div
      className={`fixed top-0 right-0 h-full w-[380px] sm:w-[420px] max-w-[95vw] sm:max-w-[90vw] bg-mantle border-l border-surface0 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
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
        <button onClick={close} className="text-subtext0 hover:text-text" aria-label="Close chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        </div>
      </div>

      {/* Messages */}
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
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue text-on-primary'
                  : 'bg-surface0 text-text'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.filters && (
                <div className="mt-2 text-xs bg-crust/50 rounded px-2 py-1 text-subtext0">
                  Filters applied to list ✓
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface0 px-3 py-2 rounded-lg text-sm">
              <p className="text-subtext0">
                Typing{'.'.repeat(typingDots || 1)}
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-surface0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
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
    </>)}
    </>
  );
}
````

**Step 5: Wire ChatProvider, ChatButton, and ChatDrawer into layout**

Update `src/app/layout.tsx` to wrap everything in `ChatProvider` and add the chat components:

```typescript
import ChatProvider from '@/components/ChatProvider';
import ChatButton from '@/components/ChatButton';
import ChatDrawer from '@/components/ChatDrawer';
import ErrorBoundary from '@/components/ErrorBoundary';

// ... in the body:
<body className={cn(inter.variable, geistMono.variable, "bg-base text-text font-sans antialiased")}>
  <ErrorBoundary>
    <ChatProvider>
      <Navbar />
      <main className="max-w-[960px] mx-auto px-8">
        {children}
      </main>
      <ChatButton />
      <ChatDrawer />
    </ChatProvider>
  </ErrorBoundary>
</body>
```

**Step 6: Connect SchoolList to ChatProvider for auto-applying filters**

In `src/components/SchoolList.tsx`, add a `useEffect` that watches `pendingFilters` from `useChatContext()` and applies them:

```typescript
import { useChatContext } from "./ChatProvider";

// Inside the component:
const { pendingFilters, clearPendingFilters } = useChatContext();
const [previousFilters, setPreviousFilters] = useState<{
  search: string;
  stateFilter: string;
  regionFilter: string;
  sortBy: SortField;
  sortDir: "asc" | "desc";
  page: number;
} | null>(null);

useEffect(() => {
  if (!pendingFilters) return;

  // Save current state for undo
  setPreviousFilters({ search, stateFilter, regionFilter, sortBy, sortDir, page });

  if (pendingFilters.sortBy) setSortBy(pendingFilters.sortBy as SortField);
  if (pendingFilters.sortDir) setSortDir(pendingFilters.sortDir);
  if (pendingFilters.state !== undefined) setStateFilter(pendingFilters.state);
  if (pendingFilters.region !== undefined) setRegionFilter(pendingFilters.region);
  if (pendingFilters.search !== undefined) setSearch(pendingFilters.search);
  setPage(1);
  clearPendingFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [pendingFilters, clearPendingFilters]);

const undoChatFilters = useCallback(() => {
  if (!previousFilters) return;
  setSearch(previousFilters.search);
  setStateFilter(previousFilters.stateFilter);
  setRegionFilter(previousFilters.regionFilter);
  setSortBy(previousFilters.sortBy);
  setSortDir(previousFilters.sortDir);
  setPage(previousFilters.page);
  setPreviousFilters(null);
}, [previousFilters]);
```

Also add an undo banner below the results count in the SchoolList JSX:

```typescript
{/* Undo banner for chat-applied filters */}
{previousFilters && (
  <div className="flex items-center gap-3 px-4 py-2 bg-blue/10 border border-blue/20 rounded-lg text-sm">
    <span className="text-text">AI updated your filters.</span>
    <button
      onClick={undoChatFilters}
      className="text-blue font-medium hover:underline"
    >
      Undo
    </button>
  </div>
)}
```

**Step 7: Create .env.example**

Create `.env.example`:

```
HF_TOKEN=your_huggingface_token_here
```

**Step 8: Commit**

```bash
git add src/app/api/chat/route.ts src/components/ChatDrawer.tsx src/components/ChatButton.tsx src/components/ChatProvider.tsx src/app/layout.tsx src/components/SchoolList.tsx .env.example
git commit -m "feat: add AI chat drawer with auto-filter integration"
```

---

## Task 8.5: Accessibility Improvements

**Files:**

- Modify: `src/components/Pagination.tsx`
- Modify: `src/components/SchoolList.tsx`
- Modify: `src/components/ChatDrawer.tsx`

**Step 1:** Sort pill keyboard navigation and `aria-label` already added inline in Task 6 grouped pills implementation. No additional changes needed.

**Step 2: Add focus management to chat drawer**

Update `ChatDrawer.tsx` to manage focus when opening/closing:

```typescript
// Add useRef for trap focus
const drawerRef = useRef<HTMLDivElement>(null);

// Add effect to trap focus when open
useEffect(() => {
  if (!isOpen) return;

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

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

  document.addEventListener('keydown', handleTab);
  return () => document.removeEventListener('keydown', handleTab);
}, [isOpen]);

// Update the drawer div to include ref
return (
  <div
    ref={drawerRef}
    role="dialog"
    aria-modal="true"
    aria-label="Chat assistant"
    className={`fixed top-0 right-0 h-full w-[380px] sm:w-[420px] max-w-[95vw] sm:max-w-[90vw] bg-mantle border-l border-surface0 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}
  >
```

**Step 3: Add skip link for keyboard navigation**

Create `src/components/SkipLink.tsx`:

```typescript
import { cn } from '@/utils/cn';

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
```

Add the skip link to `src/app/layout.tsx`:

```typescript
import SkipLink from '@/components/SkipLink';

// In body:
<body className={cn(inter.variable, geistMono.variable, "bg-base text-text font-sans antialiased")}>
  <SkipLink />
  <ChatProvider>
    {/* rest of content */}
  </ChatProvider>
</body>
```

**Step 4: Update main content to use id**

Update `src/app/page.tsx` and `src/app/school/[slug]/page.tsx`:

```typescript
// Wrap the main content in a div with id
<div id="main-content" className="py-12">
  {/* content */}
</div>
```

**Step 5: Add Escape key handler for chat**

Update `ChatDrawer.tsx`:

```typescript
// Add effect to handle Escape key
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      close();
    }
  };

  if (isOpen) {
    document.addEventListener("keydown", handleEscape);
  }

  return () => document.removeEventListener("keydown", handleEscape);
}, [isOpen, close]);
```

**Step 6: aria-live regions already added inline**

The results count in SchoolList.tsx already includes `aria-live="polite"` and `aria-atomic="true"` from the Task 6 implementation above.

**Step 7: Commit**

```bash
git add src/components/Pagination.tsx src/components/SchoolList.tsx src/components/ChatDrawer.tsx src/components/SkipLink.tsx src/app/layout.tsx src/app/page.tsx src/app/school/\[slug\]/page.tsx
git commit -m "feat: add accessibility improvements - keyboard nav, focus management, screen reader support"
```
