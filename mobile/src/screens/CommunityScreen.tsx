import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookHorizontalCard, ReviewCard, UserCard } from "../components/Cards";
import { FormInput } from "../components/Controls";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle } from "../components/Screen";
import type { Book, Reader, Review, RootStackParamList } from "../types";

export function CommunityScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [readers, setReaders] = useState<Reader[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const payload = await apiRequest<{ readers: Reader[]; trendingBooks: Book[]; recentReviews: Review[] }>("/api/mobile/community", { token });
      setReaders(payload.readers);
      setTrendingBooks(payload.trendingBooks);
      setRecentReviews(payload.recentReviews);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Communaute indisponible.");
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

  async function searchReaders() {
    if (query.trim().length < 2) {
      await load(true);
      return;
    }

    setError("");
    try {
      const payload = await apiRequest<{ readers: Reader[] }>(`/api/users/search?q=${encodeURIComponent(query)}`, { token });
      setReaders(payload.readers);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Recherche impossible.");
    }
  }

  async function follow(userId: string) {
    await apiRequest("/api/follows", { method: "POST", token, body: { followingId: userId } });
    setReaders((current) => current.map((reader) => (reader.id === userId ? { ...reader, isFollowing: true } : reader)));
  }

  async function unfollow(userId: string) {
    await apiRequest(`/api/follows?followingId=${encodeURIComponent(userId)}`, { method: "DELETE", token });
    setReaders((current) => current.map((reader) => (reader.id === userId ? { ...reader, isFollowing: false } : reader)));
  }

  if (isLoading) {
    return (
      <Screen>
        <SectionTitle eyebrow="Social" title="Communaute" />
        <LoadingSkeleton rows={6} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => load(true)}>
      <SectionTitle eyebrow="Social" title="Communaute" />
      <FormInput onChangeText={setQuery} placeholder="Chercher un lecteur" value={query} />
      <BookHorizontalCard
        book={{ id: "search", title: "Recherche lecteurs", authors: ["BookBox"], thumbnailUrl: null }}
        actionLabel="Chercher"
        detail="Trouve des personnes a suivre pour alimenter ton feed."
        onAction={searchReaders}
      />
      {error ? <ErrorState detail={error} title="Communaute indisponible" /> : null}
      {readers.length ? (
        readers.map((reader) => (
          <UserCard
            key={reader.id}
            reader={reader}
            onFollow={() => (reader.isFollowing ? unfollow(reader.id) : follow(reader.id))}
            onPress={() => navigation.navigate("PublicProfile", { userId: reader.id })}
          />
        ))
      ) : (
        <EmptyState title="Aucun lecteur" />
      )}

      <SectionTitle eyebrow="Reviews" title="Dernieres discussions" />
      {recentReviews.length ? (
        recentReviews.slice(0, 6).map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))
      ) : (
        <EmptyState title="Aucune review recente" />
      )}

      <SectionTitle eyebrow="Livres" title="Qui tournent" />
      {trendingBooks.slice(0, 6).map((book) => (
        <BookHorizontalCard key={book.id} book={book} badge="Commu" onPress={() => navigation.navigate("BookDetails", { bookId: book.id })} />
      ))}
    </Screen>
  );
}
