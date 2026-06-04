import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { apiError, conflict } from "@/server/http/errors";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().email(),
  password: z.string().min(8).max(120)
});

export async function POST(request: Request) {
  try {
    const input = signupSchema.parse(await request.json());
    const email = input.email.toLowerCase();
    const username = input.username.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existing) {
      throw conflict("Cet email ou pseudo est déjà utilisé.", "USER_ALREADY_EXISTS");
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        username,
        email,
        passwordHash: await hashPassword(input.password)
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
