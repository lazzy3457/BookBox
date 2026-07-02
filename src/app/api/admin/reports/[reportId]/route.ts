import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { apiError } from "@/server/http/errors";
import { updateModerationReport } from "@/server/services/moderation";
import { reportUpdateSchema } from "@/server/validation/moderation";

export async function PATCH(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const moderator = await requireAdmin();
    const { reportId } = await params;
    const input = reportUpdateSchema.parse(await request.json());
    const report = await updateModerationReport({ id: reportId, moderatorId: moderator.id, ...input });
    return NextResponse.json({ report });
  } catch (error) {
    return apiError(error);
  }
}
