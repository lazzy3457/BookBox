import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { reviewMutationSchema } from "@/server/validation/reviews";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const input = reviewMutationSchema.parse(await request.json());
    const review = await prisma.review.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId: input.bookId
        }
      },
      update: {
        rating: input.rating,
        body: input.body,
        spoiler: input.spoiler
      },
      create: {
        userId,
        bookId: input.bookId,
        rating: input.rating,
        body: input.body,
        spoiler: input.spoiler
      },
      include: { book: true, user: true }
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
