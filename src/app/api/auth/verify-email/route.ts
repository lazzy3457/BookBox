import { AccountTokenType } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";
import { consumeAccountToken } from "@/server/services/accountTokens";

export async function POST(request: Request) {
  try {
    const { token } = z.object({ token: z.string().min(20).max(500) }).parse(await request.json());
    const userId = await consumeAccountToken(token, AccountTokenType.VERIFY_EMAIL);
    if (!userId) throw Object.assign(new Error("Ce lien est invalide ou expiré."), { status: 400, code: "TOKEN_INVALID" });
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
