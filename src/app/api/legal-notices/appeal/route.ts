import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";
import { appealSchema } from "@/server/validation/moderation";
import { createAppeal } from "@/server/services/legalNotices";

export async function POST(request: Request) {
  try {
    await enforceRateLimit({ scope: "legal-notice-appeal", identifier: getClientIdentifier(request), limit: 3, windowMs: 60 * 60_000 });
    const appeal = await createAppeal(appealSchema.parse(await request.json()));
    return NextResponse.json({ ok: true, accepted: Boolean(appeal) });
  } catch (error) {
    return apiError(error);
  }
}
