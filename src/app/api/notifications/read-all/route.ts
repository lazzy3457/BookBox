import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await prisma.notification.updateMany({ where: { recipientId: userId, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ unreadCount: 0 });
  } catch (error) {
    return apiError(error);
  }
}
