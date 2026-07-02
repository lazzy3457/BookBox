import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { getRecommendations } from "@/server/services/recommendations";
import { updateLibraryStatus } from "@/server/services/readingJournal";
import { ReadingStatus } from "@prisma/client";

const feedbackSchema = z.object({
  bookId: z.string().min(1),
  action: z.enum(["dismiss", "read"])
});

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const recommendations = await getRecommendations(userId);
    return NextResponse.json({ recommendations });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = feedbackSchema.parse(await request.json());
    if (input.action === "read") {
      await updateLibraryStatus(userId, input.bookId, ReadingStatus.READ);
    } else {
      await prisma.recommendationDismissal.upsert({
        where: { userId_bookId: { userId, bookId: input.bookId } },
        update: {},
        create: { userId, bookId: input.bookId }
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
