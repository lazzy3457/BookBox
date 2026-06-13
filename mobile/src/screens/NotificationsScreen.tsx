import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle } from "../components/Screen";
import { colors, radius, spacing } from "../theme";
import type { BookBoxNotification, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

type Payload = {
  notifications: BookBoxNotification[];
  unreadCount: number;
};

export function NotificationsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const nextPayload = await apiRequest<Payload>("/api/mobile/notifications", { token });
      setPayload(nextPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Notifications indisponibles.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => undefined;
    }, [load])
  );

  async function openNotification(notification: BookBoxNotification) {
    if (!notification.readAt) {
      await apiRequest(`/api/mobile/notifications/${notification.id}/read`, { method: "PATCH", token }).catch(() => null);
      setPayload((current) =>
        current
          ? {
              ...current,
              unreadCount: Math.max(0, current.unreadCount - 1),
              notifications: current.notifications.map((item) =>
                item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
              )
            }
          : current
      );
    }

    const bookMatch = notification.targetUrl?.match(/^\/books\/([^/]+)$/);

    if (bookMatch?.[1]) {
      navigation.navigate("BookDetails", { bookId: bookMatch[1] });
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingSkeleton rows={5} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => load(true)}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Social</Text>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.detail}>
          {payload?.unreadCount ? `${payload.unreadCount} notification${payload.unreadCount > 1 ? "s" : ""} non lue${payload.unreadCount > 1 ? "s" : ""}.` : "Tout est lu."}
        </Text>
      </View>

      {error ? <ErrorState detail={error} title="Notifications indisponibles" onRetry={() => load(true)} /> : null}

      <SectionTitle eyebrow="Inbox" title="Activite recente" />
      {payload?.notifications.length ? (
        payload.notifications.map((notification) => (
          <Pressable key={notification.id} onPress={() => openNotification(notification)} style={[styles.card, notification.readAt ? null : styles.unreadCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{notification.title}</Text>
              {!notification.readAt ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.message}>{notification.message}</Text>
            <Text style={styles.date}>{new Date(notification.createdAt).toLocaleDateString()}</Text>
          </Pressable>
        ))
      ) : (
        <EmptyState title="Aucune notification" detail="Les likes, commentaires et nouvelles reviews d'amis arriveront ici." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  kicker: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: colors.paper,
    fontSize: 31,
    fontWeight: "900"
  },
  detail: {
    color: colors.muted,
    lineHeight: 21
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  unreadCard: {
    borderColor: colors.mint
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: colors.paper,
    flex: 1,
    fontSize: 16,
    fontWeight: "900"
  },
  dot: {
    backgroundColor: colors.mint,
    borderRadius: 999,
    height: 10,
    width: 10
  },
  message: {
    color: colors.muted,
    lineHeight: 20
  },
  date: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: "800"
  }
});
