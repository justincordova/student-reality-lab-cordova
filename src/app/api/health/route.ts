import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withHttpLogging } from "@/lib/api-wrapper";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withHttpLogging(request, async () => {
    try {
      return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
