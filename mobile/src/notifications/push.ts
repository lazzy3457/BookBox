import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiRequest } from "../api/client";
import type { NotificationPreference } from "../types";

type RegistrationResult = {
  status: "registered" | "disabled" | "denied" | "unavailable" | "missing-project" | "setup-error";
  token?: string;
  message?: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

function getProjectId() {
  return Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
}

export async function getPushPermissionStatus() {
  const permission = await Notifications.getPermissionsAsync();
  return permission.status;
}

export async function registerForPushNotifications(token: string, preferences?: NotificationPreference | null): Promise<RegistrationResult> {
  if (
    preferences &&
    (!preferences.enabled ||
      (!preferences.likesEnabled && !preferences.commentsEnabled && !preferences.friendReviewsEnabled && !preferences.followersEnabled))
  ) {
    return { status: "disabled" };
  }

  if (!Notifications?.getExpoPushTokenAsync) {
    return { status: "unavailable" };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("bookbox-social", {
      name: "BookBox social",
      description: "Likes, commentaires et nouvelles reviews d'amis",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 160, 250],
      lightColor: "#7AF7C4"
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") {
    return { status: "denied" };
  }

  const projectId = getProjectId();

  if (!projectId) {
    return { status: "missing-project" };
  }

  let expoPushToken: string;

  try {
    expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    return {
      status: "setup-error",
      message: error instanceof Error ? error.message : "Configuration push Android incomplete."
    };
  }

  await apiRequest("/api/mobile/push-tokens", {
    method: "POST",
    token,
    body: {
      token: expoPushToken,
      platform: Platform.OS
    }
  });

  return { status: "registered", token: expoPushToken };
}

export async function unregisterPushToken(authToken: string, expoPushToken: string) {
  await apiRequest("/api/mobile/push-tokens", {
    method: "DELETE",
    token: authToken,
    body: { token: expoPushToken }
  });
}

function targetUrlFromResponse(response: { notification: { request: { content: { data?: Record<string, unknown> } } } } | null) {
  const targetUrl = response?.notification.request.content.data?.targetUrl;
  return typeof targetUrl === "string" ? targetUrl : null;
}

export function subscribeToNotificationTaps(onTargetUrl: (targetUrl: string) => void) {
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return () => undefined;
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const targetUrl = targetUrlFromResponse(response);

    if (targetUrl) {
      onTargetUrl(targetUrl);
    }
  });

  return () => subscription.remove();
}

export async function getInitialNotificationTargetUrl() {
  if (!Notifications?.getLastNotificationResponseAsync) {
    return null;
  }

  return targetUrlFromResponse(await Notifications.getLastNotificationResponseAsync());
}
