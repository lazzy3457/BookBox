import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";
import { pushTokenSchema } from "@/server/validation/notifications";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = pushTokenSchema.parse(await request.json());
    const pushToken = await prisma.pushToken.upsert({
      where: { token: input.token },
      update: {
        userId,
        platform: input.platform,
        isActive: true
      },
      create: {
        userId,
        token: input.token,
        platform: input.platform
      }
    });

    return NextResponse.json({ pushToken }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const input = pushTokenSchema.pick({ token: true }).parse(await request.json());

    await prisma.pushToken.updateMany({
      where: { userId, token: input.token },
      data: { isActive: false }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
