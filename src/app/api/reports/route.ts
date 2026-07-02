import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { createModerationReport } from "@/server/services/moderation";
import { reportCreateSchema } from "@/server/validation/moderation";

export async function POST(request: Request) {
  try {
    const reporterId = await requireCurrentUserId(request);
    await enforceRateLimit({
      scope: "moderation-report",
      identifier: reporterId,
      limit: 10,
      windowMs: 60 * 60_000
    });
    const input = reportCreateSchema.parse(await request.json());
    const report = await createModerationReport({ reporterId, ...input });
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
