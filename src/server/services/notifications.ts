import { NotificationType, type NotificationPreference } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { fetchWithTimeout } from "@/server/http/fetchWithTimeout";
import { areUsersBlocked } from "@/server/services/blocks";
import { extractMentions } from "@/lib/mentions";

type PreferenceInput = Partial<
  Pick<NotificationPreference, "enabled" | "likesEnabled" | "commentsEnabled" | "friendReviewsEnabled" | "followersEnabled" | "groupsEnabled">
>;

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
  friendReviewsEnabled: true,
  followersEnabled: true,
  groupsEnabled: true
};

export function allowsNotification(
  preferences:
    | Pick<NotificationPreference, "enabled" | "likesEnabled" | "commentsEnabled" | "friendReviewsEnabled" | "followersEnabled" | "groupsEnabled">
    | null,
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

  if (type === NotificationType.NEW_FOLLOWER) {
    return effective.followersEnabled;
  }

  if (
    type === NotificationType.GROUP_REPLY ||
    type === NotificationType.GROUP_MENTION ||
    type === NotificationType.GROUP_INVITE ||
    type === NotificationType.GROUP_THREAD
  ) {
    return effective.groupsEnabled;
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
    console.warn(`[notifications] No active push token for user ${recipientId}.`);
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
    const response = await fetchWithTimeout(EXPO_PUSH_URL, {
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
      console.warn("[notifications] Expo push request failed.", { status: response.status, payload });
      return;
    }

    payload.data.forEach((ticket, index) => {
      if (ticket.status === "error") {
        console.warn("[notifications] Expo push ticket error.", {
          error: ticket.details?.error
        });
      }
    });

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
    console.warn("[notifications] Expo push request threw before delivery.");
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
  if (input.actorId && await areUsersBlocked(input.actorId, input.recipientId)) {
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

export async function notifyNewFollower(input: { followerId: string; followingId: string }) {
  const follower = await prisma.user.findUnique({
    where: { id: input.followerId },
    select: { name: true, username: true }
  });

  if (!follower) {
    return null;
  }

  return createNotification({
    recipientId: input.followingId,
    actorId: input.followerId,
    type: NotificationType.NEW_FOLLOWER,
    title: `${displayName(follower)} te suit`,
    message: "Un nouveau lecteur suit ton profil.",
    targetUrl: `/profile/${input.followerId}`
  });
}

export async function notifyBadgeEarned(input: { userId: string; badgeName: string; tierName: string }) {
  return createNotification({
    recipientId: input.userId,
    actorId: null,
    type: NotificationType.BADGE_EARNED,
    title: `Nouveau badge : ${input.badgeName} (${input.tierName})`,
    message: "Retrouve tous tes badges sur ton profil.",
    targetUrl: "/profile#badges"
  });
}

// Groupes : on ne prévient que des réponses qui nous concernent, des mentions et des invitations.
// La cloche d'un groupe (notifyAll) ajoute les nouvelles discussions.
async function mentionedMembers(groupId: string, text: string | null, excludeIds: string[]) {
  const usernames = extractMentions(text);
  if (!usernames.length) return [];
  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { notIn: excludeIds }, user: { username: { in: usernames }, suspendedAt: null } },
    select: { userId: true }
  });
  return members.map((member) => member.userId);
}

export async function notifyGroupThread(input: { actorId: string; threadId: string }) {
  const thread = await prisma.groupThread.findUnique({
    where: { id: input.threadId },
    include: { author: { select: { name: true, username: true } }, group: { select: { id: true, slug: true, name: true } } }
  });
  if (!thread) return;
  const targetUrl = `/groups/${thread.group.slug}/threads/${thread.id}`;
  const mentioned = await mentionedMembers(thread.group.id, [thread.title, thread.body].filter(Boolean).join(" "), [input.actorId]);
  const subscribers = await prisma.groupMember.findMany({
    where: { groupId: thread.group.id, notifyAll: true, userId: { notIn: [input.actorId, ...mentioned] } },
    select: { userId: true }
  });

  await Promise.all([
    ...mentioned.map((recipientId) =>
      createNotification({ recipientId, actorId: input.actorId, type: NotificationType.GROUP_MENTION, title: `${displayName(thread.author)} t'a mentionné dans ${thread.group.name}`, message: thread.title, targetUrl })
    ),
    ...subscribers.map(({ userId }) =>
      createNotification({ recipientId: userId, actorId: input.actorId, type: NotificationType.GROUP_THREAD, title: `Nouvelle discussion dans ${thread.group.name}`, message: thread.title, targetUrl })
    )
  ]);
}

export async function notifyGroupPost(input: { actorId: string; postId: string }) {
  const post = await prisma.groupPost.findUnique({
    where: { id: input.postId },
    include: {
      author: { select: { name: true, username: true } },
      parent: { select: { authorId: true } },
      thread: { select: { id: true, title: true, authorId: true, group: { select: { id: true, slug: true, name: true } } } }
    }
  });
  if (!post) return;
  const targetUrl = `/groups/${post.thread.group.slug}/threads/${post.thread.id}`;
  const repliedTo = [...new Set([post.parent?.authorId, post.thread.authorId].filter((id): id is string => Boolean(id) && id !== input.actorId))];
  const mentioned = await mentionedMembers(post.thread.group.id, post.body, [input.actorId, ...repliedTo]);

  await Promise.all([
    ...repliedTo.map((recipientId) =>
      createNotification({
        recipientId,
        actorId: input.actorId,
        type: NotificationType.GROUP_REPLY,
        title: recipientId === post.parent?.authorId ? `${displayName(post.author)} t'a répondu` : `${displayName(post.author)} a répondu à ta discussion`,
        message: post.thread.title,
        targetUrl
      })
    ),
    ...mentioned.map((recipientId) =>
      createNotification({ recipientId, actorId: input.actorId, type: NotificationType.GROUP_MENTION, title: `${displayName(post.author)} t'a mentionné dans ${post.thread.group.name}`, message: post.thread.title, targetUrl })
    )
  ]);
}

export async function notifyGroupInvite(input: { actorId: string; groupId: string; recipientId: string }) {
  const [group, actor] = await Promise.all([
    prisma.group.findUnique({ where: { id: input.groupId }, select: { slug: true, name: true } }),
    prisma.user.findUnique({ where: { id: input.actorId }, select: { name: true, username: true } })
  ]);
  if (!group || !actor) return null;
  return createNotification({
    recipientId: input.recipientId,
    actorId: input.actorId,
    type: NotificationType.GROUP_INVITE,
    title: `${displayName(actor)} t'invite dans ${group.name}`,
    message: "Rejoins le groupe pour participer aux discussions.",
    targetUrl: `/groups/${group.slug}`
  });
}
