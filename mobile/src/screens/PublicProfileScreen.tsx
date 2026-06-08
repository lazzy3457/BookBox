import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookRow } from "../components/BookRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { LoadingState, Screen, SectionTitle } from "../components/Screen";
import { colors, spacing } from "../theme";
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

  async function load() {
    const nextPayload = await apiRequest<Payload>(`/api/mobile/profiles/${route.params.userId}`, { token });
    setPayload(nextPayload);
  }

  useEffect(() => {
    load();
  }, [route.params.userId]);

  async function follow() {
    await apiRequest("/api/follows", { method: "POST", token, body: { followingId: route.params.userId } });
    await load();
  }

  if (!payload) return <LoadingState />;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Profil lecteur</Text>
        <Text style={styles.name}>{payload.user.name ?? payload.user.username ?? "Lecteur BookBox"}</Text>
        <Text style={styles.bio}>{payload.user.bio ?? "Aucune bio pour le moment."}</Text>
        <Text style={styles.meta}>
          {payload.stats.library} livres - {payload.stats.reviews} reviews - {payload.stats.followers} followers
        </Text>
        {!payload.isOwnProfile ? (
          <PrimaryButton disabled={payload.isFollowing} label={payload.isFollowing ? "Suivi" : "Suivre"} onPress={follow} />
        ) : null}
      </View>
      <SectionTitle eyebrow="Bibliotheque" title="Derniers livres" />
      {payload.recentBooks.map((item) => (
        <BookRow key={item.id} book={item.book} badge={item.status} onPress={() => navigation.navigate("BookDetails", { bookId: item.book.id })} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
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
  meta: {
    color: colors.mint,
    fontWeight: "900"
  }
});
