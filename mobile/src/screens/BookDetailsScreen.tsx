import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookRow } from "../components/BookRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { LoadingState, Screen, SectionTitle } from "../components/Screen";
import { colors, spacing } from "../theme";
import type { Book, ReadingStatus, Review, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "BookDetails">;
type BookDetailsPayload = {
  book: Book & { reviews: Review[] };
  userBook: { status: ReadingStatus; isFavorite: boolean } | null;
  stats: { averageRating: number | null; reviews: number; readers: number; favorites: number };
  authorBooks: Book[];
};

const statusLabels: Record<ReadingStatus, string> = {
  TO_READ: "A lire",
  READING: "En cours",
  READ: "Lu",
  ABANDONED: "Abandonne"
};

export function BookDetailsScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const [payload, setPayload] = useState<BookDetailsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const nextPayload = await apiRequest<BookDetailsPayload>(`/api/mobile/books/${route.params.bookId}`, { token });
    setPayload(nextPayload);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, [route.params.bookId]);

  async function setStatus(status: ReadingStatus) {
    await apiRequest("/api/library", {
      method: "POST",
      token,
      body: { bookId: route.params.bookId, status }
    });
    await load();
  }

  async function toggleFavorite() {
    await apiRequest(`/api/mobile/favorites/${route.params.bookId}`, { method: "POST", token });
    await load();
  }

  if (isLoading || !payload) return <LoadingState />;

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.cover}>
          {payload.book.thumbnailUrl ? <Image source={{ uri: payload.book.thumbnailUrl }} style={styles.image} /> : null}
        </View>
        <Text style={styles.title}>{payload.book.title}</Text>
        <Text style={styles.authors}>{payload.book.authors.join(", ") || "Auteur inconnu"}</Text>
        <Text style={styles.meta}>
          {payload.stats.averageRating ? `${payload.stats.averageRating.toFixed(1)}/5` : "Pas encore note"} - {payload.stats.readers} lecteurs
        </Text>
      </View>

      <View style={styles.actions}>
        {(Object.keys(statusLabels) as ReadingStatus[]).map((status) => (
          <Pressable key={status} onPress={() => setStatus(status)} style={styles.statusButton}>
            <Text style={styles.statusText}>{statusLabels[status]}</Text>
          </Pressable>
        ))}
      </View>
      {payload.userBook ? (
        <PrimaryButton
          label={payload.userBook.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          onPress={toggleFavorite}
          tone="ghost"
        />
      ) : null}

      {payload.book.description ? <Text style={styles.description}>{payload.book.description}</Text> : null}

      <SectionTitle eyebrow="Reviews" title="Discussions" />
      {payload.book.reviews.map((review) => (
        <View key={review.id} style={styles.review}>
          <Text style={styles.reviewTitle}>{review.user?.name ?? "Lecteur BookBox"} - {review.rating}/5</Text>
          {review.body ? <Text style={styles.reviewBody}>{review.spoiler ? "Cette review contient des spoilers." : review.body}</Text> : null}
        </View>
      ))}

      <SectionTitle eyebrow="Auteur" title="Autres livres" />
      {payload.authorBooks.map((book) => (
        <BookRow key={book.id} book={book} onPress={() => navigation.push("BookDetails", { bookId: book.id })} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cover: {
    alignSelf: "center",
    aspectRatio: 2 / 3,
    backgroundColor: colors.panelSoft,
    overflow: "hidden",
    width: 150
  },
  image: {
    height: "100%",
    width: "100%"
  },
  title: {
    color: colors.paper,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34
  },
  authors: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "700"
  },
  meta: {
    color: colors.mint,
    fontWeight: "900"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statusButton: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  statusText: {
    color: colors.paper,
    fontWeight: "900"
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23
  },
  review: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  reviewTitle: {
    color: colors.paper,
    fontWeight: "900"
  },
  reviewBody: {
    color: colors.muted,
    lineHeight: 21
  }
});
