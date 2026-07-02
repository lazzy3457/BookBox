import { NotificationType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { allowsNotification, defaultNotificationPreferences } from "@/server/services/notifications";

describe("notification preferences", () => {
  it("allows all notification types by default", () => {
    expect(allowsNotification(null, NotificationType.REVIEW_LIKE)).toBe(true);
    expect(allowsNotification(null, NotificationType.REVIEW_COMMENT)).toBe(true);
    expect(allowsNotification(null, NotificationType.FRIEND_REVIEW)).toBe(true);
    expect(allowsNotification(null, NotificationType.NEW_FOLLOWER)).toBe(true);
  });

  it("blocks all notification types when globally disabled", () => {
    const preferences = { ...defaultNotificationPreferences, enabled: false };

    expect(allowsNotification(preferences, NotificationType.REVIEW_LIKE)).toBe(false);
    expect(allowsNotification(preferences, NotificationType.REVIEW_COMMENT)).toBe(false);
    expect(allowsNotification(preferences, NotificationType.FRIEND_REVIEW)).toBe(false);
    expect(allowsNotification(preferences, NotificationType.NEW_FOLLOWER)).toBe(false);
  });

  it("maps granular switches to the right notification families", () => {
    expect(allowsNotification({ ...defaultNotificationPreferences, likesEnabled: false }, NotificationType.REVIEW_LIKE)).toBe(false);
    expect(allowsNotification({ ...defaultNotificationPreferences, likesEnabled: false }, NotificationType.COMMENT_LIKE)).toBe(false);
    expect(allowsNotification({ ...defaultNotificationPreferences, commentsEnabled: false }, NotificationType.REVIEW_COMMENT)).toBe(false);
    expect(allowsNotification({ ...defaultNotificationPreferences, commentsEnabled: false }, NotificationType.COMMENT_REPLY)).toBe(false);
    expect(allowsNotification({ ...defaultNotificationPreferences, friendReviewsEnabled: false }, NotificationType.FRIEND_REVIEW)).toBe(false);
    expect(allowsNotification({ ...defaultNotificationPreferences, followersEnabled: false }, NotificationType.NEW_FOLLOWER)).toBe(false);
  });
});
