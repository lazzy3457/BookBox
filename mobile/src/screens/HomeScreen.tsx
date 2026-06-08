import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookRow } from "../components/BookRow";
import { EmptyState, LoadingState, Screen, SectionTitle } from "../components/Screen";
import { colors, spacing } from "../theme";
import type { Book, RootStackParamList } from "../types";

type HomePayload = {
  trending: Book[];
  activity: Array<{
    id: string;
    type: "review" | "library";
    review?: { rating: number; bookId: string; book: Book; user: { name: string | null } };
    entry?: { status: string; bookId: string; book: Book; user: { name: string | null } };
  }>;
};

export function HomeScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);
      apiRequest<HomePayload>("/api/mobile/home", { token })
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
      <View style={styles.hero}>
        <Text style={styles.kicker}>BooksBox mobile</Text>
        <Text style={styles.heroTitle}>Ton carnet de lecture dans ta poche.</Text>
      </View>

      <SectionTitle eyebrow="Rayon actif" title="Tendances" />
      {payload?.trending.length ? (
        payload.trending.slice(0, 8).map((book) => (
          <BookRow key={book.id} book={book} badge="Hot" onPress={() => navigation.navigate("BookDetails", { bookId: book.id })} />
        ))
      ) : (
        <EmptyState title="Pas encore de tendances" detail="Les livres actifs apparaitront apres les premiers ajouts." />
      )}

      <SectionTitle eyebrow="Social" title="Activite des amis" />
      {payload?.activity.length ? (
        payload.activity.slice(0, 8).map((item) => {
          const book = item.review?.book ?? item.entry?.book;
          if (!book) return null;
          return (
            <BookRow
              key={item.id}
              book={book}
              badge={item.type === "review" ? `${item.review?.rating}/5` : item.entry?.status}
              onPress={() => navigation.navigate("BookDetails", { bookId: book.id })}
            />
          );
        })
      ) : (
        <EmptyState title="Feed calme" detail="Suis des lecteurs pour voir leurs lectures et reviews ici." />
      )}
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
  kicker: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  heroTitle: {
    color: colors.paper,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36
  }
});
