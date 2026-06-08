import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookRow } from "../components/BookRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState, LoadingState, Screen, SectionTitle } from "../components/Screen";
import { colors, spacing } from "../theme";
import type { BookList, LibraryItem, Review, RootStackParamList, User } from "../types";

type ProfilePayload = {
  user: User & { _count: { library: number; reviews: number; followers: number; following: number; lists: number } };
  recentBooks: LibraryItem[];
  recentReviews: Review[];
  favorites: LibraryItem[];
  lists: BookList[];
};

export function ProfileScreen() {
  const { token, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [payload, setPayload] = useState<ProfilePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);
      apiRequest<ProfilePayload>("/api/mobile/profile", { token })
        .then((nextPayload) => {
          if (isMounted) setPayload(nextPayload);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }, [token])
  );

  if (isLoading) return <LoadingState />;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Profil lecteur</Text>
        <Text style={styles.name}>{payload?.user.name ?? "Lecteur BookBox"}</Text>
        <Text style={styles.bio}>{payload?.user.bio ?? "Aucune bio pour le moment."}</Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>{payload?.user._count.library ?? 0} livres</Text>
          <Text style={styles.stat}>{payload?.user._count.reviews ?? 0} reviews</Text>
          <Text style={styles.stat}>{payload?.user._count.followers ?? 0} followers</Text>
        </View>
      </View>

      <SectionTitle eyebrow="Coups de coeur" title="Favoris" />
      {payload?.favorites.length ? (
        payload.favorites.map((item) => (
          <BookRow key={item.id} book={item.book} onPress={() => navigation.navigate("BookDetails", { bookId: item.book.id })} />
        ))
      ) : (
        <EmptyState title="Pas encore de favoris" />
      )}

      <SectionTitle eyebrow="Collections" title="Listes" />
      {payload?.lists.length ? (
        payload.lists.map((list) => (
          <PrimaryButton key={list.id} label={`${list.title} (${list._count?.entries ?? 0})`} onPress={() => navigation.navigate("ListDetails", { listId: list.id })} tone="ghost" />
        ))
      ) : (
        <EmptyState title="Aucune liste" />
      )}

      <SectionTitle eyebrow="Historique" title="Derniers livres" />
      {payload?.recentBooks.map((item) => (
        <BookRow
          key={item.id}
          book={item.book}
          badge={item.status}
          onPress={() => navigation.navigate("BookDetails", { bookId: item.book.id })}
        />
      ))}

      <PrimaryButton label="Se deconnecter" onPress={signOut} tone="danger" />
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
    lineHeight: 20
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  stat: {
    backgroundColor: colors.ink,
    color: colors.paper,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 7
  }
});
