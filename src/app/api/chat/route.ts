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
} from "@/lib";
import { loadSchools } from "@/lib/data/loadSchools";
import { env } from "@/lib/env";

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
  const schoolsForPrompt = schools.slice(0, 60);
  const dataStr = schoolsForPrompt
    .map((s) => {
      const formatCurrency = (val: number | null | undefined) =>
        val !== null && val !== undefined ? `$${val.toLocaleString()}` : "N/A";
      const formatPercent = (val: number) => `${Math.min(100, Math.max(0, val * 100)).toFixed(1)}%`;

      return `${s.name} | ${s.city}, ${s.state} | ${s.region} | CSRank: #${s.csRanking ?? "N/A"} | Niche: #${s.nicheRanking ?? "N/A"} | In-state: ${formatCurrency(s.tuitionInState)} | Out-of-state: ${formatCurrency(s.tuitionOutOfState)} | R&B: ${formatCurrency(s.roomAndBoard)} | Earnings: ${formatCurrency(s.medianEarnings6yr)} | Debt: ${formatCurrency(s.medianDebt)} | Accept: ${formatPercent(s.acceptanceRate)} | Grad: ${formatPercent(s.graduationRate)} | Niche: Overall=${s.nicheGrades.overall} Academics=${s.nicheGrades.academics} Food=${s.nicheGrades.campusFood} Party=${s.nicheGrades.partyScene} Social=${s.nicheGrades.studentLife} Dorms=${s.nicheGrades.dorms} Safety=${s.nicheGrades.safety} Profs=${s.nicheGrades.professors} Athletics=${s.nicheGrades.athletics} Diversity=${s.nicheGrades.diversity} Value=${s.nicheGrades.value} Location=${s.nicheGrades.location}`;
    })
    .join("\n");

  const prompt = `You are CSPathFinder AI. Help students find CS programs. You have detailed data on ${schoolsForPrompt.length} schools below (out of ${totalCount} total). For schools not in this list, say you don't have detailed data and point to Niche.com or College Scorecard.

RULES:
- Be brief. 2-4 sentences max. No bullet lists of stats — the app already shows those.
- Use **bold** for school names only.
- When filtering/sorting helps, append a filter block (no explanation needed):
\`\`\`filter
{"sortBy": "...", "sortDir": "..."}
\`\`\`
- sortBy options: csRanking, nicheRanking, roi, earnings, tuitionInState, acceptanceRate
- rankSource: "csrankings" (default) or "niche" — sets which ranking source the UI uses
- filter fields: state ("CA", "NJ"), region ("Northeast"), search (name match)
- Do NOT list out stats — the user can see them in the app. Just answer the question conversationally.

Examples:
- "Best food?" → "**UCLA** and **UVA** top the food rankings." + filter block
- "Cheapest in CA?" → "**UC Berkeley** and **UCLA** are the most affordable in-state." + filter block
- "Best NJ school?" → "**Princeton** is the top-ranked CS program in New Jersey at #10." + filter block

School data (top ${schoolsForPrompt.length}):
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
            max_tokens: 1024,
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
        let isRetryable = true;

        if (err && typeof err === "object" && "status" in err) {
          const status = (err as { status?: number }).status;
          if (typeof status === "number") {
            isRetryable = status === 429 || (status >= 500 && status < 600);
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
