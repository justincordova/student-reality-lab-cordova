import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { withHttpLogging } from "@/lib/api-wrapper";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withHttpLogging(request, async () => {
    try {
      const limited = await checkRateLimit(request, {
        id: "api/health",
        limit: 60,
        windowSecs: 60,
      });
      if (limited) return limited;

      return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
