import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        }
      }
    });
    const unreadCount = await prisma.notification.count({
      where: { recipientId: userId, readAt: null }
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return apiError(error);
  }
}
