import { AccountTokenType } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";
import { hashPassword } from "@/server/auth/password";
import { consumeAccountToken } from "@/server/services/accountTokens";

export async function POST(request: Request) {
  try {
    const input = z.object({ token: z.string().min(20).max(500), password: z.string().min(8).max(120) }).parse(await request.json());
    const userId = await consumeAccountToken(input.token, AccountTokenType.RESET_PASSWORD);
    if (!userId) throw Object.assign(new Error("Ce lien est invalide ou expiré."), { status: 400, code: "TOKEN_INVALID" });
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(input.password), sessionVersion: { increment: 1 } }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
