import { NotificationType, type NotificationPreference } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

type PreferenceInput = Partial<Pick<NotificationPreference, "enabled" | "likesEnabled" | "commentsEnabled" | "friendReviewsEnabled">>;

type PushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  priority: "high";
  channelId: string;
  data?: Record<string, string>;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export const defaultNotificationPreferences = {
  enabled: true,
  likesEnabled: true,
  commentsEnabled: true,
  friendReviewsEnabled: true
};

export function allowsNotification(
  preferences: Pick<NotificationPreference, "enabled" | "likesEnabled" | "commentsEnabled" | "friendReviewsEnabled"> | null,
  type: NotificationType
) {
  const effective = preferences ?? defaultNotificationPreferences;

  if (!effective.enabled) {
    return false;
  }

  if (type === NotificationType.REVIEW_LIKE || type === NotificationType.COMMENT_LIKE) {
    return effective.likesEnabled;
  }

  if (type === NotificationType.REVIEW_COMMENT || type === NotificationType.COMMENT_REPLY) {
    return effective.commentsEnabled;
  }

  if (type === NotificationType.FRIEND_REVIEW) {
    return effective.friendReviewsEnabled;
  }

  return true;
}

export async function getOrCreateNotificationPreferences(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId, ...defaultNotificationPreferences }
  });
}

export async function updateNotificationPreferences(userId: string, input: PreferenceInput) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: input,
    create: { userId, ...defaultNotificationPreferences, ...input }
  });
}

async function sendPushNotifications(
  recipientId: string,
  notification: { id: string; type: NotificationType; title: string; message: string; targetUrl: string | null }
) {
  const tokens = await prisma.pushToken.findMany({
    where: { userId: recipientId, isActive: true },
    select: { token: true }
  });

  if (!tokens.length) {
    return;
  }

  const messages: PushMessage[] = tokens.map(({ token }) => ({
    to: token,
    sound: "default",
    title: notification.title,
    body: notification.message,
    priority: "high",
    channelId: "bookbox-social",
    data: {
      notificationId: notification.id,
      type: notification.type,
      ...(notification.targetUrl ? { targetUrl: notification.targetUrl } : {})
    }
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });
    const payload = (await response.json().catch(() => null)) as { data?: Array<{ status?: string; details?: { error?: string } }> } | null;

    if (!response.ok || !payload?.data) {
      return;
    }

    const invalidTokens = payload.data
      .map((ticket, index) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? tokens[index]?.token : null))
      .filter((token): token is string => Boolean(token));

    if (invalidTokens.length) {
      await prisma.pushToken.updateMany({
        where: { token: { in: invalidTokens } },
        data: { isActive: false }
      });
    }
  } catch {
    // Push delivery is best effort; the inbox notification remains the source of truth.
  }
}

async function createNotification(input: {
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  targetUrl?: string | null;
}) {
  if (input.actorId && input.actorId === input.recipientId) {
    return null;
  }

  const preferences = await prisma.notificationPreference.findUnique({ where: { userId: input.recipientId } });

  if (!allowsNotification(preferences, input.type)) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      message: input.message,
      targetUrl: input.targetUrl
    }
  });

  await sendPushNotifications(input.recipientId, notification);
  return notification;
}

function displayName(user: { name: string | null; username?: string | null }) {
  return user.name ?? user.username ?? "Un lecteur";
}

export async function notifyReviewReaction(input: { actorId: string; reviewId: string }) {
  const review = await prisma.review.findUnique({
    where: { id: input.reviewId },
    include: { user: true, book: true }
  });
  const actor = await prisma.user.findUnique({ where: { id: input.actorId }, select: { name: true, username: true } });

  if (!review || !actor) {
    return null;
  }

  return createNotification({
    recipientId: review.userId,
    actorId: input.actorId,
    type: NotificationType.REVIEW_LIKE,
    title: `${displayName(actor)} a aime ta review`,
    message: review.book.title,
    targetUrl: `/books/${review.bookId}`
  });
}

export async function notifyCommentReaction(input: { actorId: string; commentId: string }) {
  const comment = await prisma.reviewComment.findUnique({
    where: { id: input.commentId },
    include: { review: { include: { book: true } } }
  });
  const actor = await prisma.user.findUnique({ where: { id: input.actorId }, select: { name: true, username: true } });

  if (!comment || !actor) {
    return null;
  }

  return createNotification({
    recipientId: comment.userId,
    actorId: input.actorId,
    type: NotificationType.COMMENT_LIKE,
    title: `${displayName(actor)} a aime ton commentaire`,
    message: comment.review.book.title,
    targetUrl: `/books/${comment.review.bookId}`
  });
}

export async function notifyReviewComment(input: { actorId: string; commentId: string }) {
  const comment = await prisma.reviewComment.findUnique({
    where: { id: input.commentId },
    include: {
      user: true,
      parent: true,
      review: { include: { book: true } }
    }
  });

  if (!comment) {
    return null;
  }

  const isReply = Boolean(comment.parentId);
  const recipientId = comment.parent?.userId ?? comment.review.userId;

  return createNotification({
    recipientId,
    actorId: input.actorId,
    type: isReply ? NotificationType.COMMENT_REPLY : NotificationType.REVIEW_COMMENT,
    title: isReply ? `${displayName(comment.user)} t'a repondu` : `${displayName(comment.user)} a commente ta review`,
    message: comment.review.book.title,
    targetUrl: `/books/${comment.review.bookId}`
  });
}

export async function notifyFriendReview(input: { actorId: string; reviewId: string }) {
  const review = await prisma.review.findUnique({
    where: { id: input.reviewId },
    include: { user: true, book: true }
  });

  if (!review) {
    return [];
  }

  const followers = await prisma.follow.findMany({
    where: { followingId: input.actorId },
    select: { followerId: true }
  });

  return Promise.all(
    followers.map((follow) =>
      createNotification({
        recipientId: follow.followerId,
        actorId: input.actorId,
        type: NotificationType.FRIEND_REVIEW,
        title: `${displayName(review.user)} a publie une review`,
        message: review.book.title,
        targetUrl: `/books/${review.bookId}`
      })
    )
  );
}
