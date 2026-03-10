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
  const totalCount = schools.length;
  const schoolsForPrompt = schools.slice(0, 30);
  const dataStr = schoolsForPrompt
    .map(
      (s) =>
        `${s.name} | ${s.city}, ${s.state} | ${s.region} | Rank #${s.ranking} | In-state: $${s.tuitionInState} | Out-of-state: $${s.tuitionOutOfState} | R&B: $${s.roomAndBoard} | Earnings: ${s.medianEarnings6yr ? "$" + s.medianEarnings6yr : "N/A"} | Debt: ${s.medianDebt ? "$" + s.medianDebt : "N/A"} | Accept: ${(s.acceptanceRate * 100).toFixed(1)}% | Grad: ${(s.graduationRate * 100).toFixed(1)}% | Niche: Overall=${s.nicheGrades.overall} Academics=${s.nicheGrades.academics} Food=${s.nicheGrades.campusFood} Party=${s.nicheGrades.partyScene} Social=${s.nicheGrades.studentLife} Dorms=${s.nicheGrades.dorms} Safety=${s.nicheGrades.safety} Profs=${s.nicheGrades.professors} Athletics=${s.nicheGrades.athletics} Diversity=${s.nicheGrades.diversity} Value=${s.nicheGrades.value} Location=${s.nicheGrades.location}`
    )
    .join("\n");

  const prompt = `You are CSPathFinder AI, an assistant that helps students find Computer Science programs at US colleges. You have data on ${totalCount} CS programs.

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

NOTE: The data above shows the top 30 schools for brevity. The app has data on all ${totalCount} schools. If the user asks about a school ranked 31-100, use a filter command to help them find it (e.g. \`\`\`filter\n{"search": "school name"}\n\`\`\`) rather than guessing its stats.

If the user asks about something we do NOT have data for, say you don't have that specific data and suggest they check Niche.com or College Scorecard. Do NOT make up data.

Be concise and helpful. Always answer the question first, then include the filter block if applicable.

Here is the data:
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
