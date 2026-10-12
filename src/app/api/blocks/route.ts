import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { blockUser, listBlockedUsers, unblockUser } from "@/server/services/blocks";
import { blockMutationSchema } from "@/server/validation/blocks";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    return NextResponse.json({ users: await listBlockedUsers(userId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const blockerId = await requireCurrentUserId(request);
    await enforceRateLimit({ scope: "user-block", identifier: blockerId, limit: 20, windowMs: 60 * 60_000 });
    const { userId } = blockMutationSchema.parse(await request.json());
    return NextResponse.json(await blockUser(blockerId, userId), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const blockerId = await requireCurrentUserId(request);
    const { userId } = blockMutationSchema.parse({ userId: new URL(request.url).searchParams.get("userId") });
    return NextResponse.json(await unblockUser(blockerId, userId));
  } catch (error) {
    return apiError(error);
  }
}
