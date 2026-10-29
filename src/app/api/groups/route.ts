import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { groupCreateSchema } from "@/server/validation/groups";
import { uniqueGroupSlug } from "@/server/services/groups";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "group-create", identifier: userId, limit: 5, windowMs: 24 * 60 * 60_000 });
    const input = groupCreateSchema.parse(await request.json());
    if (input.topic === "BOOK" && input.bookId && !(await prisma.book.findUnique({ where: { id: input.bookId }, select: { id: true } }))) {
      throw notFound("Livre introuvable.", "BOOK_NOT_FOUND");
    }

    const group = await prisma.group.create({
      data: {
        slug: await uniqueGroupSlug(input.name),
        name: input.name,
        description: input.description,
        topic: input.topic,
        topicLabel: input.topic === "BOOK" || input.topic === "FREE" ? null : input.topicLabel,
        bookId: input.topic === "BOOK" ? input.bookId : null,
        readalongBookId: input.topic === "BOOK" ? input.bookId : null,
        visibility: input.visibility,
        emblem: input.emblem,
        challengeGoal: input.topic === "CHALLENGE" ? input.challengeGoal ?? null : null,
        createdById: userId,
        members: { create: { userId, role: "MODERATOR" } }
      },
      select: { id: true, slug: true }
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
