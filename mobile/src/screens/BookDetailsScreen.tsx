import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookPosterCard, ListCard, ReviewCard } from "../components/Cards";
import { FormInput, RatingInput, StatusSelector } from "../components/Controls";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle, StatPill } from "../components/Screen";
import { slugifyAuthor } from "../lib/authors";
import { colors, radius, shadows, spacing } from "../theme";
import type { Book, BookList, ReadingStatus, Review, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "BookDetails">;
type BookDetailsPayload = {
  book: Book & { reviews: Review[] };
  userBook: { status: ReadingStatus; isFavorite: boolean } | null;
  currentUserReview: Review | null;
  stats: { averageRating: number | null; reviews: number; readers: number; favorites: number };
  authorBooks: Book[];
};

export function BookDetailsScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const [payload, setPayload] = useState<BookDetailsPayload | null>(null);
  const [lists, setLists] = useState<BookList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [reviewRating, setReviewRating] = useState(4);
  const [reviewBody, setReviewBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);

  async function load(refreshing = false) {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const [nextPayload, listPayload] = await Promise.all([
        apiRequest<BookDetailsPayload>(`/api/mobile/books/${route.params.bookId}`, { token }),
        apiRequest<{ lists: BookList[] }>("/api/mobile/lists", { token }).catch(() => ({ lists: [] }))
      ]);
      setPayload(nextPayload);
      setLists(listPayload.lists);
      setReviewRating(nextPayload.currentUserReview?.rating ?? 4);
      setReviewBody(nextPayload.currentUserReview?.body ?? "");
      setSpoiler(nextPayload.currentUserReview?.spoiler ?? false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Livre indisponible.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [route.params.bookId]);

  async function setStatus(status: ReadingStatus) {
    setIsSaving(true);
    setError("");

    try {
      await apiRequest("/api/library", {
        method: "POST",
        token,
        body: { bookId: route.params.bookId, status }
      });
      await load();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Statut impossible a modifier.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleFavorite() {
    setIsSaving(true);
    setError("");

    try {
      await apiRequest(`/api/mobile/favorites/${route.params.bookId}`, { method: "POST", token });
      await load();
    } catch (favoriteError) {
      setError(favoriteError instanceof Error ? favoriteError.message : "Favori impossible a modifier.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveReview() {
    if (!payload) return;
    setIsSaving(true);
    setError("");

    try {
      if (payload.currentUserReview) {
        await apiRequest(`/api/reviews/${payload.currentUserReview.id}`, {
          method: "PATCH",
          token,
          body: { rating: reviewRating, body: reviewBody, spoiler }
        });
      } else {
        await apiRequest("/api/reviews", {
          method: "POST",
          token,
          body: { bookId: payload.book.id, rating: reviewRating, body: reviewBody, spoiler }
        });
      }
      await load(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Review impossible a enregistrer.");
    } finally {
      setIsSaving(false);
    }
  }

  async function reactToReview(reviewId: string) {
    setIsSaving(true);
    setError("");

    try {
      await apiRequest(`/api/reviews/${reviewId}/reactions`, { method: "POST", token, body: { kind: "LIKE" } });
      await load(true);
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : "Reaction impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  async function commentReview(reviewId: string, body: string) {
    setIsSaving(true);
    setError("");

    try {
      await apiRequest(`/api/reviews/${reviewId}/comments`, { method: "POST", token, body: { body } });
      await load(true);
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Commentaire impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addToList(listId: string) {
    setIsSaving(true);
    setError("");

    try {
      await apiRequest(`/api/mobile/lists/${listId}/books`, {
        method: "POST",
        token,
        body: { bookId: route.params.bookId }
      });
      await load(true);
    } catch (listError) {
      setError(listError instanceof Error ? listError.message : "Ajout a la liste impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingSkeleton rows={6} />
      </Screen>
    );
  }

  if (!payload) {
    return (
      <Screen>
        <ErrorState detail={error} onRetry={() => load()} title="Livre indisponible" />
      </Screen>
    );
  }

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => load(true)}>
      <View style={styles.hero}>
        <View style={styles.cover}>
          {payload.book.thumbnailUrl ? <Image source={{ uri: payload.book.thumbnailUrl }} style={styles.image} /> : <Text style={styles.coverFallback}>BookBox</Text>}
        </View>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>Fiche livre</Text>
          <Text style={styles.title}>{payload.book.title}</Text>
          <View style={styles.authorLinks}>
            {payload.book.authors.length ? payload.book.authors.map((author) => (
              <Pressable
                key={author}
                onPress={() => navigation.navigate("AuthorDetails", { authorSlug: slugifyAuthor(author), authorName: author })}
                style={styles.authorChip}
              >
                <Text style={styles.authorChipText}>{author}</Text>
              </Pressable>
            )) : <Text style={styles.authors}>Auteur inconnu</Text>}
          </View>
          <View style={styles.statRow}>
            <StatPill label="Moyenne" value={payload.stats.averageRating ? payload.stats.averageRating.toFixed(1) : "-"} />
            <StatPill label="Reviews" value={payload.stats.reviews} />
            <StatPill label="Lecteurs" value={payload.stats.readers} />
          </View>
        </View>
      </View>

      {error ? <ErrorState detail={error} title="Action impossible" /> : null}

      <View style={styles.panel}>
        <SectionTitle eyebrow="Bibliotheque" title="Statut de lecture" />
        <StatusSelector value={payload.userBook?.status} onChange={setStatus} />
        {payload.userBook ? (
          <PrimaryButton
            isLoading={isSaving}
            label={payload.userBook.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            onPress={toggleFavorite}
            tone="ghost"
          />
        ) : null}
      </View>

      {payload.book.description ? (
        <View style={styles.panel}>
          <SectionTitle eyebrow="Resume" title="Description" />
          <Text style={styles.description}>{payload.book.description}</Text>
        </View>
      ) : null}

      <View style={styles.panel}>
        <SectionTitle eyebrow="Review" title={payload.currentUserReview ? "Modifier ta review" : "Publier une review"} />
        <RatingInput value={reviewRating} onChange={setReviewRating} />
        <FormInput multiline onChangeText={setReviewBody} placeholder="Mini-review optionnelle" value={reviewBody} />
        <Pressable onPress={() => setSpoiler((current) => !current)} style={[styles.spoilerToggle, spoiler ? styles.spoilerActive : null]}>
          <Text style={[styles.spoilerToggleText, spoiler ? styles.spoilerActiveText : null]}>{spoiler ? "Spoiler active" : "Marquer comme spoiler"}</Text>
        </Pressable>
        <PrimaryButton isLoading={isSaving} label={payload.currentUserReview ? "Enregistrer" : "Publier"} onPress={saveReview} />
      </View>

      {lists.length ? (
        <View style={styles.panel}>
          <SectionTitle eyebrow="Collections" title="Ajouter a une liste" />
          {lists.slice(0, 4).map((list) => (
            <ListCard key={list.id} list={list} onPress={() => addToList(list.id)} />
          ))}
        </View>
      ) : null}

      <SectionTitle eyebrow="Reviews" title="Discussions" />
      {payload.book.reviews.length ? (
        payload.book.reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onComment={(body) => commentReview(review.id, body)}
            onReact={() => reactToReview(review.id)}
          />
        ))
      ) : (
        <EmptyState title="Aucune review" detail="Sois le premier a donner le ton sur ce livre." />
      )}

      <SectionTitle eyebrow="Auteur" title="Autres livres" />
      {payload.authorBooks.length ? (
        <View style={styles.posterGrid}>
          {payload.authorBooks.map((book) => (
            <BookPosterCard key={book.id} book={book} onPress={() => navigation.push("BookDetails", { bookId: book.id })} />
          ))}
        </View>
      ) : (
        <EmptyState title="Pas d'autres livres" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    ...shadows.card,
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg
  },
  cover: {
    alignSelf: "center",
    aspectRatio: 2 / 3,
    backgroundColor: colors.panelSoft,
    overflow: "hidden",
    width: 116
  },
  image: {
    height: "100%",
    width: "100%"
  },
  coverFallback: {
    color: colors.mint,
    fontWeight: "900"
  },
  heroText: {
    flex: 1,
    gap: spacing.sm
  },
  kicker: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: colors.paper,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 29
  },
  authors: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "700"
  },
  authorLinks: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  authorChip: {
    borderColor: colors.mint,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  authorChipText: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: "900"
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23
  },
  spoilerToggle: {
    alignSelf: "flex-start",
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  spoilerActive: {
    borderColor: colors.coral
  },
  spoilerToggleText: {
    color: colors.muted,
    fontWeight: "900"
  },
  spoilerActiveText: {
    color: colors.coral
  },
  posterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center"
  }
});
