import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { apiError } from "@/server/http/errors";
import { listModerationReports } from "@/server/services/moderation";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ reports: await listModerationReports() });
  } catch (error) {
    return apiError(error);
  }
}
