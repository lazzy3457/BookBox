import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { notifyNewFollower } from "@/server/services/notifications";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { assertUsersCanInteract } from "@/server/services/blocks";

const followSchema = z.object({
  followingId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const followerId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "follow-mutation", identifier: followerId, limit: 30, windowMs: 60_000 });
    const { followingId } = followSchema.parse(await request.json());
    await assertUsersCanInteract(followerId, followingId);

    if (followerId === followingId) {
      throw Object.assign(new Error("Impossible de se suivre soi-même."), {
        status: 400,
        code: "SELF_FOLLOW_FORBIDDEN"
      });
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });
    const follow = existing ?? await prisma.follow.create({ data: { followerId, followingId } });

    if (!existing) {
      await notifyNewFollower({ followerId, followingId });
    }

    return NextResponse.json(follow, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const followerId = await requireCurrentUserId(request);
    const { searchParams } = new URL(request.url);
    const followingId = searchParams.get("followingId");

    if (!followingId) {
      throw Object.assign(new Error("followingId est obligatoire."), { status: 400, code: "FOLLOWING_ID_REQUIRED" });
    }

    await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
