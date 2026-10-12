import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";
import { legalNoticeSchema } from "@/server/validation/moderation";
import { createLegalNotice } from "@/server/services/legalNotices";
import { getSiteUrl } from "@/lib/site";

export async function POST(request: Request) {
  try {
    await enforceRateLimit({ scope: "legal-notice", identifier: getClientIdentifier(request), limit: 5, windowMs: 60 * 60_000 });
    const input = legalNoticeSchema.parse(await request.json());
    if (new URL(input.targetUrl).origin !== getSiteUrl().origin) {
      throw Object.assign(new Error("L’adresse doit désigner un contenu publié sur BooksBox."), { status: 400, code: "INVALID_TARGET_URL" });
    }
    const notice = await createLegalNotice(input);
    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
