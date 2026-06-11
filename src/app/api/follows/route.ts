import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";

const followSchema = z.object({
  followingId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const followerId = await requireCurrentUserId(request);
    const { followingId } = followSchema.parse(await request.json());

    if (followerId === followingId) {
      throw Object.assign(new Error("Impossible de se suivre soi-même."), {
        status: 400,
        code: "SELF_FOLLOW_FORBIDDEN"
      });
    }

    const follow = await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      },
      update: {},
      create: {
        followerId,
        followingId
      }
    });

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
