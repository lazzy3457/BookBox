import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, conflict } from "@/server/http/errors";
import { notifyFriendReview } from "@/server/services/notifications";
import { reviewMutationSchema } from "@/server/validation/reviews";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = reviewMutationSchema.parse(await request.json());
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_bookId: { userId, bookId: input.bookId }
      }
    });

    if (existingReview) {
      throw conflict("Tu as deja publie une review pour ce livre. Tu peux modifier ta review existante.", "REVIEW_ALREADY_EXISTS");
    }

    const review = await prisma.review.create({
      data: {
        userId,
        bookId: input.bookId,
        rating: input.rating,
        body: input.body,
        spoiler: input.spoiler
      },
      include: { book: true, user: true }
    });

    await notifyFriendReview({ actorId: userId, reviewId: review.id });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
