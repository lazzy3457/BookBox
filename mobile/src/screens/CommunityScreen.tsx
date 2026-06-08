import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookRow } from "../components/BookRow";
import { EmptyState, LoadingState, Screen, SectionTitle } from "../components/Screen";
import { colors, spacing } from "../theme";
import type { Book, RootStackParamList, User } from "../types";

type Reader = User & {
  isFollowing: boolean;
  counts: { library: number; reviews: number; followers: number };
};

export function CommunityScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [readers, setReaders] = useState<Reader[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);
      apiRequest<{ readers: Reader[]; trendingBooks: Book[] }>("/api/mobile/community", { token })
        .then((payload) => {
          if (!isMounted) return;
          setReaders(payload.readers);
          setTrendingBooks(payload.trendingBooks);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }, [token])
  );

  async function follow(userId: string) {
    await apiRequest("/api/follows", { method: "POST", token, body: { followingId: userId } });
    setReaders((current) => current.map((reader) => (reader.id === userId ? { ...reader, isFollowing: true } : reader)));
  }

  if (isLoading) return <LoadingState />;

  return (
    <Screen>
      <SectionTitle eyebrow="Social" title="Communaute" />
      {readers.length ? (
        readers.map((reader) => (
          <Pressable key={reader.id} onPress={() => navigation.navigate("PublicProfile", { userId: reader.id })} style={styles.reader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(reader.name ?? reader.username ?? "B").slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.readerBody}>
              <Text style={styles.readerName}>{reader.name ?? reader.username ?? "Lecteur BookBox"}</Text>
              <Text style={styles.readerMeta}>
                {reader.counts.library} livres - {reader.counts.reviews} reviews - {reader.counts.followers} followers
              </Text>
            </View>
            <Pressable disabled={reader.isFollowing} onPress={() => follow(reader.id)} style={styles.followButton}>
              <Text style={styles.followText}>{reader.isFollowing ? "Suivi" : "Suivre"}</Text>
            </Pressable>
          </Pressable>
        ))
      ) : (
        <EmptyState title="Aucun lecteur" />
      )}

      <SectionTitle eyebrow="Livres" title="Qui tournent" />
      {trendingBooks.slice(0, 6).map((book) => (
        <BookRow key={book.id} book={book} badge="Commu" onPress={() => navigation.navigate("BookDetails", { bookId: book.id })} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reader: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.mint,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  avatarText: {
    color: colors.ink,
    fontWeight: "900"
  },
  readerBody: {
    flex: 1
  },
  readerName: {
    color: colors.paper,
    fontWeight: "900"
  },
  readerMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3
  },
  followButton: {
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  followText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  }
});
