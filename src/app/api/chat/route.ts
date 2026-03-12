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

function buildSystemPrompt(): string {
  if (cachedSystemPrompt && Date.now() - cachedSystemPromptAt < SYSTEM_PROMPT_TTL_MS) {
    return cachedSystemPrompt;
  }
  let schools: ReturnType<typeof loadSchools>;
  try {
    schools = loadSchools();
  } catch (err) {
    logError("Failed to load schools for system prompt", err);
    schools = [];
  }
  const totalCount = schools.length;
  const dataStr = schools
    .map((s) => {
      const formatCurrency = (val: number | null | undefined) =>
        val !== null && val !== undefined ? `$${val.toLocaleString()}` : "N/A";
      const formatPercent = (val: number) => `${Math.min(100, Math.max(0, val * 100)).toFixed(1)}%`;

      return `${s.name} [${s.slug}] | ${s.city}, ${s.state} | ${s.region} | CSRank: #${s.csRanking ?? "N/A"} | Niche: #${s.nicheRanking ?? "N/A"} | In-state: ${formatCurrency(s.tuitionInState)} | Out-of-state: ${formatCurrency(s.tuitionOutOfState)} | R&B: ${formatCurrency(s.roomAndBoard)} | Earnings: ${formatCurrency(s.medianEarnings6yr)} | Debt: ${formatCurrency(s.medianDebt)} | Accept: ${formatPercent(s.acceptanceRate)} | Grad: ${formatPercent(s.graduationRate)} | Niche: Overall=${s.nicheGrades.overall} Academics=${s.nicheGrades.academics} Food=${s.nicheGrades.campusFood} Party=${s.nicheGrades.partyScene} Social=${s.nicheGrades.studentLife} Dorms=${s.nicheGrades.dorms} Safety=${s.nicheGrades.safety} Profs=${s.nicheGrades.professors} Athletics=${s.nicheGrades.athletics} Diversity=${s.nicheGrades.diversity} Value=${s.nicheGrades.value} Location=${s.nicheGrades.location}`;
    })
    .join("\n");

  const prompt = `You are CSPathFinder AI. Help students find CS programs. You have detailed data on ${totalCount} schools below.

RULES:
- For single-school or simple questions: 2-3 sentences max.
- For comparisons of 2+ schools: up to 6-8 sentences. Use a short bullet list with **School Name**: key differentiator format for easy scanning.
- Never dump raw stats — the app shows those. Focus on qualitative insight.
- Use **bold** for school names only.
- When a superlative ranking question is asked ("best", "worst", "top", "cheapest", "most expensive", "easiest to get into", etc.), always name exactly 5 schools.
- When filtering/sorting helps, append a filter block (no explanation needed):
\`\`\`filter
{"sortBy": "...", "sortDir": "..."}
\`\`\`
- sortBy options: csRanking, nicheRanking, roi, earnings, tuitionInState, acceptanceRate, campusFood, dorms, safety, partyScene, diversity, studentLife, professors, athletics, value, location, academics
- rankSource: "csrankings" (default) or "niche" — sets which ranking source the UI uses
- filter fields: state ("CA", "NJ"), region ("Northeast"), search (name match)
- For niche grade sorts, sortDir "desc" = best first (higher grade = better).
- When asked to compare 2-4 schools, include "compare": [{"slug": "slug1", "name": "Full School Name"}, ...] in the filter block. Use the slug shown in brackets after each school name in the data. Example: MIT slug = "mit", Stanford University slug = "stanford-university".
- Do NOT list out stats — the user can see them in the app. Just answer the question conversationally.
- After your response, you MAY append a suggestions block (only when genuinely helpful):
\`\`\`suggestions
["Follow-up question 1?", "Follow-up question 2?", "Follow-up question 3?"]
\`\`\`
  Max 3 suggestions. Only include when there are natural follow-ups. Do not include for simple factual answers.

Examples:
- "Best food?" → name 5 schools with best food grades + \`\`\`filter\\n{"sortBy": "campusFood", "sortDir": "desc"}\\n\`\`\`
- "Cheapest in CA?" → name 5 cheapest CA schools + \`\`\`filter\\n{"sortBy": "tuitionInState", "sortDir": "asc", "state": "CA"}\\n\`\`\`
- "Best dorms?" → name 5 schools with best dorm grades + \`\`\`filter\\n{"sortBy": "dorms", "sortDir": "desc"}\\n\`\`\`
- "Compare MIT and Stanford" → bullet list comparison + \`\`\`filter\\n{"compare": [{"slug": "mit", "name": "MIT"}, {"slug": "stanford-university", "name": "Stanford University"}]}\\n\`\`\`
- "Best NJ school?" → name 5 NJ schools + \`\`\`filter\\n{"sortBy": "csRanking", "sortDir": "asc", "state": "NJ"}\\n\`\`\`

School data (${totalCount} schools):
${dataStr}`;

  cachedSystemPrompt = prompt;
  cachedSystemPromptAt = Date.now();
  return prompt;
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
            messages: [{ role: "system", content: systemPrompt }, ...messages],
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
