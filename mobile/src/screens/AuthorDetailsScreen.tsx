import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../api/client";
import { BookHorizontalCard } from "../components/Cards";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle, StatPill } from "../components/Screen";
import { colors, radius, shadows, spacing } from "../theme";
import type { Book, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "AuthorDetails">;

type AuthorPayload = {
  author: { name: string; bio: string | null; image: string | null };
  books: Book[];
  stats: { books: number; reviews: number; readers: number; averageRating: number | null };
  mostReadBook?: Book | null;
};

export function AuthorDetailsScreen({ route, navigation }: Props) {
  const [payload, setPayload] = useState<AuthorPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [booksOpen, setBooksOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState("");
  const description = payload?.author.bio ?? "Auteur present dans le catalogue BookBox.";
  const shouldCollapseDescription = description.length > 220;
  const visibleDescription = shouldCollapseDescription && !descriptionOpen ? `${description.slice(0, 220).trim()}...` : description;
  const visibleBooks = booksOpen ? payload?.books ?? [] : (payload?.books ?? []).slice(0, 5);
  const heroImage = !imageFailed ? payload?.author.image : null;

  async function load(refreshing = false) {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      setPayload(await apiRequest<AuthorPayload>(`/api/mobile/authors/${route.params.authorSlug}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Auteur indisponible.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [route.params.authorSlug]);

  return (
    <Screen onRefresh={() => load(true)} refreshing={isRefreshing}>
      {isLoading ? <LoadingSkeleton rows={5} /> : null}
      {error ? <ErrorState detail={error} onRetry={() => load()} /> : null}
      {!isLoading && !error && payload ? (
        <>
          <View style={styles.header}>
            <View style={styles.photoFrame}>
              {heroImage ? (
                <Image
                  resizeMode="cover"
                  source={{ uri: heroImage }}
                  style={styles.image}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <View style={styles.unknownAvatar}>
                  <View style={styles.unknownHead} />
                  <View style={styles.unknownBody} />
                </View>
              )}
            </View>
            <Text style={styles.kicker}>Auteur</Text>
            <Text style={styles.title}>{payload.author.name}</Text>
            <Text style={styles.description}>{visibleDescription}</Text>
            {shouldCollapseDescription ? (
              <Text style={styles.moreLink} onPress={() => setDescriptionOpen((current) => !current)}>
                {descriptionOpen ? "Voir moins" : "Voir plus"}
              </Text>
            ) : null}
            <View style={styles.stats}>
              <StatPill label="Livres" value={payload.stats.books} />
              <StatPill label="Reviews" value={payload.stats.reviews} />
              <StatPill label="Lecteurs" value={payload.stats.readers} />
            </View>
          </View>
          <SectionTitle eyebrow="Catalogue" title="Livres" />
          {payload.books.length ? (
            <>
              {visibleBooks.map((book) => (
                <BookHorizontalCard
                  key={book.id}
                  book={book}
                  detail={book.publishedDate}
                  onPress={() => navigation.navigate("BookDetails", { bookId: book.id })}
                />
              ))}
              {payload.books.length > 5 ? (
                <View style={styles.moreWrap}>
                  <Text style={styles.moreLink} onPress={() => setBooksOpen((current) => !current)}>
                    {booksOpen ? "Voir moins" : `Voir plus (${payload.books.length - 5})`}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <EmptyState title="Aucun livre trouve pour cet auteur." />
          )}
        </>
      ) : null}
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
  photoFrame: {
    alignItems: "center",
    backgroundColor: colors.panelSoft,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 210,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%"
  },
  image: {
    height: "100%",
    width: "100%"
  },
  unknownAvatar: {
    alignItems: "center",
    height: 150,
    justifyContent: "flex-end",
    width: 150
  },
  unknownHead: {
    backgroundColor: colors.paper,
    borderRadius: 999,
    height: 70,
    marginBottom: -8,
    width: 70
  },
  unknownBody: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 76,
    borderTopRightRadius: 76,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    height: 72,
    width: 132
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
  moreLink: {
    alignSelf: "flex-start",
    color: colors.mint,
    fontSize: 13,
    fontWeight: "900"
  },
  moreWrap: {
    alignItems: "flex-start"
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  }
});
