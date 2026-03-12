import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import type { ChatCompletion } from "openai/resources";
import { z } from "zod/v4";
import {
  childLogger,
  logError,
  checkRateLimit,
  withHttpLogging,
  ApiError,
  handleApiError,
  env,
} from "@/lib";
import { loadSchools } from "@/lib/data/loadSchools";
import { gradeToNumeric } from "@/lib/data/schema";
import type { School } from "@/lib/data/schema";

const log = childLogger("chat");

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: env.HF_TOKEN ?? "",
    });
  }
  return client;
}

const MODEL = "Qwen/Qwen2.5-72B-Instruct";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .max(2000)
    .min(1)
    .trim()
    .refine((val) => {
      const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /data:text\/html/gi,
      ];
      return !dangerousPatterns.some((pattern) => pattern.test(val));
    }, "Message contains potentially dangerous content"),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
});

const SYSTEM_PROMPT_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cachedSystemPrompt: string | null = null;
let cachedSystemPromptAt = 0;

// Sorted school names by a numeric scorer, desc=true means highest first.
function topN(schools: School[], n: number, score: (s: School) => number, desc: boolean): string {
  return [...schools]
    .sort((a, b) => (desc ? score(b) - score(a) : score(a) - score(b)))
    .slice(0, n)
    .map((s) => s.name)
    .join(", ");
}

// Shared schools cache — loaded once per process on first successful load.
// On failure we do NOT cache, so the next request retries the file read.
let cachedSchools: School[] | null = null;
function getSchools(): School[] {
  if (cachedSchools !== null) return cachedSchools;
  try {
    cachedSchools = loadSchools();
  } catch (err) {
    logError("Failed to load schools", err);
    return [];
  }
  return cachedSchools;
}

// Detect if the user's message is asking for a best/worst data fact and, if so,
// return a short context string (appended to their message) with the pre-computed
// answer. This is injected directly into the conversation so the AI cannot ignore
// it the way it ignores system-prompt instructions.
function buildDataContext(userMessage: string): string | null {
  const q = userMessage.toLowerCase();
  const schools = getSchools();
  if (schools.length === 0) return null;

  // --- Detect metric ---
  type GradeKey = keyof School["nicheGrades"];
  let gradeKey: GradeKey | null = null;
  let metricLabel = "";

  if (/\b(food|dining|cafeteria|meal|eat)\b/.test(q)) {
    gradeKey = "campusFood";
    metricLabel = "campus food";
  } else if (/\b(safe(?:st)?|unsafe|safety|danger(?:ous)?|crime)\b/.test(q)) {
    gradeKey = "safety";
    metricLabel = "safety";
  } else if (/\b(dorm|dorms|housing|residence hall)\b/.test(q)) {
    gradeKey = "dorms";
    metricLabel = "dorms";
  } else if (/\b(party|parties|nightlife|social scene)\b/.test(q)) {
    gradeKey = "partyScene";
    metricLabel = "party scene";
  } else if (/\b(student life|social life|clubs|activities)\b/.test(q)) {
    gradeKey = "studentLife";
    metricLabel = "student life";
  } else if (/\b(divers|inclusion|inclusive)\b/.test(q)) {
    gradeKey = "diversity";
    metricLabel = "diversity";
  } else if (/\b(professors?|faculty|teacher|instruction|teaching)\b/.test(q)) {
    gradeKey = "professors";
    metricLabel = "professors";
  } else if (/\b(athletic|sport|sports|gym)\b/.test(q)) {
    gradeKey = "athletics";
    metricLabel = "athletics";
  } else if (/\b(value|bang for|worth)\b/.test(q)) {
    gradeKey = "value";
    metricLabel = "value";
  } else if (/\b(location|neighborhood|area|surroundings)\b/.test(q)) {
    gradeKey = "location";
    metricLabel = "location";
  } else if (/\b(academics?|education|learning quality)\b/.test(q)) {
    gradeKey = "academics";
    metricLabel = "academics";
  }

  if (gradeKey) {
    const key = gradeKey;
    const isWorst = /\b(worst|bad|lowest|least|poor|unsafe|dangerous|terrible|weakest)\b/.test(q);
    const isBest = /\b(best|top|highest|safest|greatest|strongest|excellent|most)\b/.test(q);
    if (!isWorst && !isBest) return null;
    const desc = isBest; // desc=true → highest grade first (best); desc=false → lowest first (worst)
    const names = topN(schools, 5, (s) => gradeToNumeric(s.nicheGrades[key]), desc);
    const direction = isBest ? "best" : "worst";
    return `\n\n[VERIFIED DATA: The 5 schools with the ${direction} ${metricLabel} rating in our database are: ${names}. Use these exact school names in your answer.]`;
  }

  // --- Tuition queries ---
  const hasTuition = /\b(tuition|cost|cheap(?:est)?|afford|expensive|price|inexpensive)\b/.test(q);
  if (hasTuition) {
    const outOfState = /\b(out.of.state|nonresident|non-resident)\b/.test(q);
    const field: "tuitionInState" | "tuitionOutOfState" = outOfState
      ? "tuitionOutOfState"
      : "tuitionInState";
    const label = outOfState ? "out-of-state tuition" : "in-state tuition";
    const isCheap = /\b(cheap|lowest|cheapest|affordable|least expensive|inexpensive)\b/.test(q);
    const isExpensive = /\b(expensive|highest|most expensive|priciest|costliest)\b/.test(q);
    if (!isCheap && !isExpensive) return null;
    const names = topN(schools, 5, (s) => s[field], isExpensive);
    const direction = isCheap ? "cheapest" : "most expensive";
    return `\n\n[VERIFIED DATA: The 5 schools with the ${direction} ${label} in our database are: ${names}. Use these exact school names in your answer.]`;
  }

  // --- Earnings ---
  const hasEarnings = /\b(earnings?|salary|salaries|income|pay|wage|money after)\b/.test(q);
  if (hasEarnings) {
    const isHigh = /\b(high|highest|best|most|top)\b/.test(q);
    const isLow = /\b(low|lowest|worst|least)\b/.test(q);
    if (!isHigh && !isLow) return null;
    const names = topN(schools, 5, (s) => s.medianEarnings6yr ?? 0, isHigh);
    const direction = isHigh ? "highest" : "lowest";
    return `\n\n[VERIFIED DATA: The 5 schools with the ${direction} median earnings (6yr) in our database are: ${names}. Use these exact school names in your answer.]`;
  }

  // --- Acceptance rate ---
  const hasAccept = /\b(accept|admit|selective|easy to get in|hard to get in|get into)\b/.test(q);
  if (hasAccept) {
    const isEasy = /\b(easiest|least selective|highest accept|easy to get)\b/.test(q);
    const isHard = /\b(hardest|most selective|lowest accept|hard to get)\b/.test(q);
    if (!isEasy && !isHard) return null;
    const names = topN(schools, 5, (s) => s.acceptanceRate, isEasy);
    const direction = isEasy
      ? "highest acceptance rate (easiest to get into)"
      : "lowest acceptance rate (hardest to get into)";
    return `\n\n[VERIFIED DATA: The 5 schools with the ${direction} in our database are: ${names}. Use these exact school names in your answer.]`;
  }

  // --- ROI ---
  const hasROI = /\b(roi|return on investment|payback|pay.?back|bang for)\b/.test(q);
  if (hasROI) {
    const isBestROI = /\b(best|top|highest|greatest)\b/.test(q);
    const isWorstROI = /\b(worst|lowest|poorest)\b/.test(q);
    if (!isBestROI && !isWorstROI) return null;
    // Best ROI = lowest payback years
    const names = topN(
      schools,
      5,
      (s) => {
        const e = s.medianEarnings6yr;
        if (!e || e <= 0) return isBestROI ? Infinity : -Infinity;
        return ((s.tuitionInState + s.roomAndBoard) * 4) / e;
      },
      isWorstROI // desc=true for worst ROI (highest payback years)
    );
    const direction = isBestROI ? "best" : "worst";
    return `\n\n[VERIFIED DATA: The 5 schools with the ${direction} ROI in our database are: ${names}. Use these exact school names in your answer.]`;
  }

  return null;
}

function buildSystemPrompt(): string {
  if (cachedSystemPrompt && Date.now() - cachedSystemPromptAt < SYSTEM_PROMPT_TTL_MS) {
    return cachedSystemPrompt;
  }
  const schools = getSchools();
  const totalCount = schools.length;

  const dataStr = schools
    .map((s) => {
      const formatCurrency = (val: number | null | undefined) =>
        val !== null && val !== undefined ? `$${val.toLocaleString()}` : "N/A";
      const formatPercent = (val: number) => `${Math.min(100, Math.max(0, val * 100)).toFixed(1)}%`;

      return `${s.name} [${s.slug}] | ${s.city}, ${s.state} | ${s.region} | CSRank: #${s.csRanking ?? "N/A"} | Niche: #${s.nicheRanking ?? "N/A"} | In-state: ${formatCurrency(s.tuitionInState)} | Out-of-state: ${formatCurrency(s.tuitionOutOfState)} | R&B: ${formatCurrency(s.roomAndBoard)} | Earnings: ${formatCurrency(s.medianEarnings6yr)} | Debt: ${formatCurrency(s.medianDebt)} | Accept: ${formatPercent(s.acceptanceRate)} | Grad: ${formatPercent(s.graduationRate)} | Niche: Overall=${s.nicheGrades.overall} Academics=${s.nicheGrades.academics} Food=${s.nicheGrades.campusFood} Party=${s.nicheGrades.partyScene} Social=${s.nicheGrades.studentLife} Dorms=${s.nicheGrades.dorms} Safety=${s.nicheGrades.safety} Profs=${s.nicheGrades.professors} Athletics=${s.nicheGrades.athletics} Diversity=${s.nicheGrades.diversity} Value=${s.nicheGrades.value} Location=${s.nicheGrades.location}`;
    })
    .join("\n");

  const prompt = `You are CSPathFinder AI. Help students find CS programs. You have data on ${totalCount} schools.

RULES:
- For single-school or simple questions: 2-3 sentences max.
- For comparisons of 2+ schools: up to 6-8 sentences. Use a short bullet list with **School Name**: key differentiator format for easy scanning.
- Never dump raw stats — the app shows those. Focus on qualitative insight.
- Use **bold** for school names only.
- When the user's message includes a [VERIFIED DATA: ...] block, you MUST use those exact school names. Do not substitute, reorder, or replace them with schools from your training knowledge.
- Always emit a filter block when sorting/filtering helps (no explanation needed):
\`\`\`filter
{"sortBy": "...", "sortDir": "..."}
\`\`\`
- sortBy options: csRanking, nicheRanking, roi, earnings, tuitionInState, acceptanceRate, campusFood, dorms, safety, partyScene, diversity, studentLife, professors, athletics, value, location, academics
- rankSource: "csrankings" (default) or "niche" — sets which ranking source the UI uses
- filter fields: state ("CA", "NJ"), region ("Northeast"), search (name match)
- For niche grade sorts: sortDir "desc" = best first, sortDir "asc" = worst first.
- When asked to compare 2-3 schools, include "compare": [{"slug": "slug1", "name": "Full School Name"}, ...] in the filter block. Slugs are shown in [brackets] in the school data below.
- Do NOT list out stats — the user can see them in the app. Just answer conversationally.
- After your response, you MAY append a suggestions block (only when genuinely helpful, max 3):
\`\`\`suggestions
["Follow-up question 1?", "Follow-up question 2?"]
\`\`\`

Examples:
- "Worst food?" → use PRE-COMPUTED Food worst, name those 5 + \`\`\`filter\\n{"sortBy": "campusFood", "sortDir": "asc"}\\n\`\`\`
- "Least safe schools?" → use PRE-COMPUTED Safety worst, name those 5 + \`\`\`filter\\n{"sortBy": "safety", "sortDir": "asc"}\\n\`\`\`
- "Cheapest in CA?" → filter to CA schools, find cheapest from raw data + \`\`\`filter\\n{"sortBy": "tuitionInState", "sortDir": "asc", "state": "CA"}\\n\`\`\`
- "Compare MIT and Stanford" → bullet list + \`\`\`filter\\n{"compare": [{"slug": "mit", "name": "MIT"}, {"slug": "stanford-university", "name": "Stanford University"}]}\\n\`\`\`

School data (${totalCount} schools):
${dataStr}`;

  cachedSystemPrompt = prompt;
  cachedSystemPromptAt = Date.now();
  return prompt;
}

// ── HF availability state ────────────────────────────────────────────────────
// Tracked across requests in this server process so we can report status without
// making a probe request to HuggingFace (which would waste credits).
type HfStatus = "available" | "rate_limited" | "quota_exceeded" | "unknown";

interface HfState {
  status: HfStatus;
  since: number; // epoch ms
}

let hfState: HfState = { status: "unknown", since: 0 };

// Rate-limit state clears automatically after 60 s (HF free-tier window).
const RATE_LIMIT_TTL_MS = 60_000;

function getHfAvailability(): { available: boolean; status: HfStatus; retryAfterMs?: number } {
  if (hfState.status === "rate_limited") {
    const age = Date.now() - hfState.since;
    if (age < RATE_LIMIT_TTL_MS) {
      return { available: false, status: "rate_limited", retryAfterMs: RATE_LIMIT_TTL_MS - age };
    }
    // TTL expired — optimistically assume available again
    hfState = { status: "available", since: Date.now() };
  }
  if (hfState.status === "quota_exceeded") {
    return { available: false, status: "quota_exceeded" };
  }
  return { available: true, status: hfState.status === "unknown" ? "unknown" : "available" };
}

function markHfError(statusCode: number) {
  if (statusCode === 429) {
    hfState = { status: "rate_limited", since: Date.now() };
  } else if (statusCode === 402 || statusCode === 403) {
    hfState = { status: "quota_exceeded", since: Date.now() };
  }
}

function markHfSuccess() {
  hfState = { status: "available", since: Date.now() };
}

export async function GET() {
  const { available, status, retryAfterMs } = getHfAvailability();
  return NextResponse.json({ available, status, ...(retryAfterMs ? { retryAfterMs } : {}) });
}

export async function POST(req: NextRequest) {
  return withHttpLogging(req, async () => {
    if (!env.HF_TOKEN) {
      throw new ApiError(503, "Chat service not configured");
    }

    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        const originHost = originUrl.host.toLowerCase();
        const normalizedHost = host.toLowerCase();
        if (!originUrl.protocol.startsWith("http") || originHost !== normalizedHost) {
          throw new ApiError(403, "Forbidden");
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(403, "Forbidden");
      }
    }

    const contentType = req.headers.get("content-type");
    if (!contentType?.startsWith("application/json")) {
      throw new ApiError(415, "Content-Type must be application/json");
    }

    const rateLimitResponse = await checkRateLimit(req, {
      id: "api/chat",
      limit: 10,
      windowSecs: 60,
    });
    if (rateLimitResponse) return rateLimitResponse;

    let body: unknown;
    try {
      const rawBody = await req.text();
      if (rawBody.length === 0) {
        throw new ApiError(400, "Request body cannot be empty");
      }
      if (rawBody.length > 10000) {
        throw new ApiError(413, "Request body too large");
      }
      body = JSON.parse(rawBody);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(400, "Invalid JSON body");
    }

    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      logError("Invalid request format", parsed.error, { endpoint: "/api/chat" });
      throw new ApiError(400, "Invalid request format");
    }

    const { messages } = parsed.data;
    const systemPrompt = buildSystemPrompt();

    // Inject pre-computed data answer directly into the last user message so the
    // model cannot ignore it. This prevents hallucination on data-lookup questions.
    const lastMsg = messages[messages.length - 1];
    const dataContext = lastMsg.role === "user" ? buildDataContext(lastMsg.content) : null;
    const augmentedMessages = dataContext
      ? [...messages.slice(0, -1), { role: lastMsg.role, content: lastMsg.content + dataContext }]
      : messages;

    log.debug("Sending chat request", { messageCount: messages.length, model: MODEL });

    const MAX_RETRIES = 3;
    const MAX_RETRY_DELAY_MS = 5000;
    const REQUEST_TIMEOUT_MS = 25000;
    let lastErr: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const abortPromise = new Promise<never>((_, reject) => {
          const onAbort = () => {
            controller.signal.removeEventListener("abort", onAbort);
            reject(new Error("Request timeout"));
          };
          controller.signal.addEventListener("abort", onAbort);
        });

        const completion = (await Promise.race([
          getClient().chat.completions.create({
            model: MODEL,
            messages: [{ role: "system", content: systemPrompt }, ...augmentedMessages],
            max_tokens: 2048,
            // @ts-expect-error: signal parameter might not be recognized by older OpenAI types
            signal: controller.signal,
          }),
          abortPromise,
        ])) as ChatCompletion;

        clearTimeout(timeoutId);

        const choice = completion.choices[0];
        if (!choice?.message?.content) {
          throw new Error("No content returned from AI");
        }

        const reply = choice.message.content;
        if (typeof reply !== "string" || reply.length === 0) {
          throw new Error("Invalid response from AI");
        }

        markHfSuccess();
        log.info("Chat response generated", {
          model: MODEL,
          tokens: completion.usage?.total_tokens,
        });
        return NextResponse.json({ reply });
      } catch (err) {
        lastErr = err;
        let shouldRetry = true;

        if (err && typeof err === "object" && "status" in err) {
          const status = (err as { status?: number }).status;
          if (typeof status === "number") {
            markHfError(status);
            const isRetryable = status === 429 || (status >= 500 && status < 600);
            shouldRetry = isRetryable && attempt < MAX_RETRIES - 1;
          }
        }

        if (err instanceof Error && err.message === "Request timeout") {
          shouldRetry = attempt < MAX_RETRIES - 1;
        }

        if (!shouldRetry) break;

        const delay = Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    logError("HF API error", lastErr, { model: MODEL });
    throw new ApiError(502, "Failed to get a response. Please try again.");
  }).catch(handleApiError);
}
