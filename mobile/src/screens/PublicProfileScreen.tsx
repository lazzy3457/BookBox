import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookHorizontalCard, ReviewCard } from "../components/Cards";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle, StatPill } from "../components/Screen";
import { colors, radius, shadows, spacing, statusLabels } from "../theme";
import type { LibraryItem, Review, RootStackParamList, User } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "PublicProfile">;
type Payload = {
  user: User;
  stats: { library: number; reviews: number; followers: number; following: number };
  recentBooks: LibraryItem[];
  recentReviews: Review[];
  isFollowing: boolean;
  isOwnProfile: boolean;
};

export function PublicProfileScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setError("");
    setIsLoading(true);
    try {
      const nextPayload = await apiRequest<Payload>(`/api/mobile/profiles/${route.params.userId}`, { token });
      setPayload(nextPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Profil indisponible.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [route.params.userId]);

  async function follow() {
    await apiRequest("/api/follows", { method: "POST", token, body: { followingId: route.params.userId } });
    await load();
  }

  async function unfollow() {
    await apiRequest(`/api/follows?followingId=${encodeURIComponent(route.params.userId)}`, { method: "DELETE", token });
    await load();
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingSkeleton rows={5} />
      </Screen>
    );
  }

  if (!payload) {
    return (
      <Screen>
        <ErrorState detail={error} onRetry={load} title="Profil indisponible" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Profil lecteur</Text>
        <Text style={styles.name}>{payload.user.name ?? payload.user.username ?? "Lecteur BookBox"}</Text>
        <Text style={styles.bio}>{payload.user.bio ?? "Aucune bio pour le moment."}</Text>
        <View style={styles.stats}>
          <StatPill label="Livres" value={payload.stats.library} />
          <StatPill label="Reviews" value={payload.stats.reviews} />
          <StatPill label="Followers" value={payload.stats.followers} />
        </View>
        {!payload.isOwnProfile ? (
          <PrimaryButton label={payload.isFollowing ? "Ne plus suivre" : "Suivre"} onPress={payload.isFollowing ? unfollow : follow} tone={payload.isFollowing ? "ghost" : "primary"} />
        ) : null}
      </View>
      <SectionTitle eyebrow="Bibliotheque" title="Derniers livres" />
      {payload.recentBooks.length ? payload.recentBooks.map((item) => (
        <BookHorizontalCard key={item.id} book={item.book} badge={statusLabels[item.status]} onPress={() => navigation.navigate("BookDetails", { bookId: item.book.id })} />
      )) : <EmptyState title="Aucun livre recent" />}

      <SectionTitle eyebrow="Reviews" title="Dernieres reviews" />
      {payload.recentReviews.length ? payload.recentReviews.map((review) => <ReviewCard key={review.id} review={review} />) : <EmptyState title="Aucune review" />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    ...shadows.card,
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
  name: {
    color: colors.paper,
    fontSize: 30,
    fontWeight: "900"
  },
  bio: {
    color: colors.muted,
    lineHeight: 21
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
