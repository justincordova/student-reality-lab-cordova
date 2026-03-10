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

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: env.HF_TOKEN!,
    });
  }
  return client;
}

const MODEL = "Qwen/Qwen2.5-72B-Instruct";

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
  const totalCount = schools.length;
  const schoolsForPrompt = schools.slice(0, 30);
  const dataStr = schoolsForPrompt
    .map(
      (s) =>
        `${s.name} | ${s.city}, ${s.state} | ${s.region} | Rank #${s.ranking} | In-state: $${s.tuitionInState} | Out-of-state: $${s.tuitionOutOfState} | R&B: $${s.roomAndBoard} | Earnings: ${s.medianEarnings6yr ? "$" + s.medianEarnings6yr : "N/A"} | Debt: ${s.medianDebt ? "$" + s.medianDebt : "N/A"} | Accept: ${(s.acceptanceRate * 100).toFixed(1)}% | Grad: ${(s.graduationRate * 100).toFixed(1)}% | Niche: Overall=${s.nicheGrades.overall} Academics=${s.nicheGrades.academics} Food=${s.nicheGrades.campusFood} Party=${s.nicheGrades.partyScene} Social=${s.nicheGrades.studentLife} Dorms=${s.nicheGrades.dorms} Safety=${s.nicheGrades.safety} Profs=${s.nicheGrades.professors} Athletics=${s.nicheGrades.athletics} Diversity=${s.nicheGrades.diversity} Value=${s.nicheGrades.value} Location=${s.nicheGrades.location}`
    )
    .join("\n");

  const prompt = `You are CSPathFinder AI. Help students find CS programs. Data on ${totalCount} schools.

RULES:
- Be brief. 2-4 sentences max. No bullet lists of stats — the app already shows those.
- Use **bold** for school names only.
- When filtering/sorting helps, append a filter block (no explanation needed):
\`\`\`filter
{"sortBy": "...", "sortDir": "..."}
\`\`\`
- sortBy options: ranking, roi, tuitionInState, tuitionOutOfState, medianEarnings6yr, medianDebt, acceptanceRate, graduationRate, enrollment, academics, value, diversity, athletics, partyScene, professors, location, dorms, campusFood, studentLife, safety
- filter fields: state ("CA", "NJ"), region ("Northeast"), search (name match)
- Do NOT list out stats — the user can see them in the app. Just answer the question conversationally.
- If you don't have the data, say so briefly and point to Niche.com or College Scorecard.

Examples:
- "Best food?" → "**UCLA** and **UVA** top the food rankings." + filter block
- "Cheapest in CA?" → "**UC Berkeley** and **UCLA** are the most affordable in-state." + filter block
- "Best NJ school?" → "**Princeton** is the top-ranked CS program in New Jersey at #10." + filter block

School data (top 30):
${dataStr}`;

  cachedSystemPrompt = prompt;
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
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          throw new ApiError(403, "Forbidden");
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(403, "Forbidden");
      }
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 10000) {
      throw new ApiError(413, "Request body too large");
    }

    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
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
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid request format");
    }

    const { messages } = parsed.data;
    const systemPrompt = buildSystemPrompt();
    log.debug("Sending chat request", { messageCount: messages.length, model: MODEL });

    try {
      const completion = await getClient().chat.completions.create({
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
