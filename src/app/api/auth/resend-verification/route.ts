import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";
import { sendVerificationEmail } from "@/server/services/accountTokens";

export async function POST(request: Request) {
  try {
    const { email } = z.object({ email: z.string().trim().email() }).parse(await request.json());
    await enforceRateLimit({ scope: "resend-verification", identifier: getClientIdentifier(request), limit: 5, windowMs: 60 * 60_000 });
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, email: true, emailVerified: true } });
    if (user?.email && !user.emailVerified) await sendVerificationEmail({ id: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
