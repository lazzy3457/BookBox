import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";
import { getLegalNoticeStatus } from "@/server/services/legalNotices";

export async function POST(request: Request) {
  try {
    await enforceRateLimit({ scope: "legal-notice-status", identifier: getClientIdentifier(request), limit: 10, windowMs: 60 * 60_000 });
    const input = z.object({ trackingCode: z.string().min(8).max(80), email: z.string().email() }).parse(await request.json());
    const notice = await getLegalNoticeStatus(input.trackingCode, input.email);
    return NextResponse.json({ notice });
  } catch (error) {
    return apiError(error);
  }
}
