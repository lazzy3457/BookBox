import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { apiError, notFound } from "@/server/http/errors";

export async function PATCH(request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { notificationId } = await params;
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, recipientId: userId }
    });

    if (!existing) {
      throw notFound("Notification introuvable.", "NOTIFICATION_NOT_FOUND");
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: existing.readAt ?? new Date() }
    });

    return NextResponse.json(notification);
  } catch (error) {
    return apiError(error);
  }
}
