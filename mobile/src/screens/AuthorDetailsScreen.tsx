import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../api/client";
import { BookRow } from "../components/BookRow";
import { LoadingState, Screen, SectionTitle } from "../components/Screen";
import { colors, spacing } from "../theme";
import type { Book, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "AuthorDetails">;

type AuthorPayload = {
  author: { name: string; bio: string | null; image: string | null };
  books: Book[];
  stats: { books: number; reviews: number; readers: number; averageRating: number | null };
};

export function AuthorDetailsScreen({ route, navigation }: Props) {
  const [payload, setPayload] = useState<AuthorPayload | null>(null);

  useEffect(() => {
    apiRequest<AuthorPayload>(`/api/mobile/authors/${route.params.authorSlug}`).then(setPayload);
  }, [route.params.authorSlug]);

  if (!payload) return <LoadingState />;

  return (
    <Screen>
      <View style={styles.header}>
        {payload.author.image ? <Image source={{ uri: payload.author.image }} style={styles.avatar} /> : null}
        <Text style={styles.kicker}>Auteur</Text>
        <Text style={styles.title}>{payload.author.name}</Text>
        <Text style={styles.description}>{payload.author.bio ?? "Auteur present dans le catalogue BookBox."}</Text>
        <Text style={styles.meta}>
          {payload.stats.books} livres - {payload.stats.reviews} reviews - {payload.stats.readers} lecteurs
        </Text>
      </View>
      <SectionTitle eyebrow="BookBox" title="Livres" />
      {payload.books.map((book) => (
        <BookRow key={book.id} book={book} onPress={() => navigation.navigate("BookDetails", { bookId: book.id })} />
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
  avatar: {
    height: 118,
    width: 118
  },
  kicker: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: colors.paper,
    fontSize: 30,
    fontWeight: "900"
  },
  description: {
    color: colors.muted,
    lineHeight: 21
  },
  meta: {
    color: colors.mint,
    fontWeight: "900"
  }
});
