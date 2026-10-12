import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/admin";
import { apiError } from "@/server/http/errors";
import { decideLegalNotice } from "@/server/services/legalNotices";

export async function PATCH(request: Request, { params }: { params: Promise<{ noticeId: string }> }) {
  try {
    await requireAdmin();
    const { noticeId } = await params;
    const input = z.object({
      status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]),
      decisionReason: z.string().trim().max(2000).optional().nullable()
    }).parse(await request.json());
    if ((input.status === "RESOLVED" || input.status === "DISMISSED") && !input.decisionReason) {
      throw Object.assign(new Error("Une motivation est obligatoire."), { status: 400, code: "DECISION_REASON_REQUIRED" });
    }
    return NextResponse.json({ notice: await decideLegalNotice(noticeId, input) });
  } catch (error) {
    return apiError(error);
  }
}
