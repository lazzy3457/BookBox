import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";
import { legalConfig } from "@/lib/legal";
import { sendVerificationEmail } from "@/server/services/accountTokens";

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().email(),
  password: z.string().min(8).max(120),
  ageConfirmed: z.literal(true),
  termsAccepted: z.literal(true),
  termsVersion: z.literal(legalConfig.termsVersion),
  privacyVersion: z.literal(legalConfig.privacyVersion)
});

export async function POST(request: Request) {
  try {
    const input = signupSchema.parse(await request.json());
    const email = input.email.toLowerCase();
    const username = input.username.toLowerCase();
    await Promise.all([
      enforceRateLimit({ scope: "signup-ip", identifier: getClientIdentifier(request), limit: 5, windowMs: 60 * 60_000 }),
      enforceRateLimit({ scope: "signup-email", identifier: email, limit: 3, windowMs: 60 * 60_000 })
    ]);
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) return NextResponse.json({ ok: true, verificationRequired: true }, { status: 202 });

    const user = await prisma.user.create({
      data: {
        name: input.name,
        username,
        email,
        passwordHash: await hashPassword(input.password),
        legalAcceptances: {
          create: {
            termsVersion: input.termsVersion,
            privacyVersion: input.privacyVersion,
            ageConfirmedAt: new Date(),
            source: "WEB"
          }
        }
      },
      select: { id: true, email: true }
    });
    await sendVerificationEmail({ id: user.id, email: user.email! });
    return NextResponse.json({ ok: true, verificationRequired: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
