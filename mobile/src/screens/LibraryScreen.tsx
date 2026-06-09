import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookHorizontalCard } from "../components/Cards";
import { SegmentedControl } from "../components/Controls";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle } from "../components/Screen";
import { statusLabels } from "../theme";
import type { LibraryItem, ReadingStatus, RootStackParamList } from "../types";

type LibraryFilter = "ALL" | ReadingStatus | "FAVORITES";
type LibrarySort = "RECENT" | "TITLE" | "AUTHOR";

const filterOptions: Array<{ label: string; value: LibraryFilter }> = [
  { label: "Tous", value: "ALL" },
  { label: "A lire", value: "TO_READ" },
  { label: "En cours", value: "READING" },
  { label: "Lu", value: "READ" },
  { label: "Abandonne", value: "ABANDONED" },
  { label: "Favoris", value: "FAVORITES" }
];

const sortOptions: Array<{ label: string; value: LibrarySort }> = [
  { label: "Recent", value: "RECENT" },
  { label: "Titre", value: "TITLE" },
  { label: "Auteur", value: "AUTHOR" }
];

export function LibraryScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("ALL");
  const [sort, setSort] = useState<LibrarySort>("RECENT");

  const load = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const payload = await apiRequest<{ items: LibraryItem[] }>("/api/library", { token });
      setItems(payload.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Bibliotheque indisponible.");
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

  const visibleItems = items
    .filter((item) => (filter === "ALL" ? true : filter === "FAVORITES" ? item.isFavorite : item.status === filter))
    .slice()
    .sort((first, second) => {
      if (sort === "TITLE") return first.book.title.localeCompare(second.book.title);
      if (sort === "AUTHOR") return (first.book.authors[0] ?? "").localeCompare(second.book.authors[0] ?? "");
      return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
    });

  if (isLoading) {
    return (
      <Screen>
        <SectionTitle eyebrow="Personnel" title="Bibliotheque" />
        <LoadingSkeleton rows={6} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => load(true)}>
      <SectionTitle eyebrow="Personnel" title="Bibliotheque" />
      <SegmentedControl options={filterOptions} value={filter} onChange={setFilter} />
      <SegmentedControl options={sortOptions} value={sort} onChange={setSort} />
      {error ? <ErrorState detail={error} onRetry={() => load()} title="Bibliotheque indisponible" /> : null}
      {visibleItems.length ? (
          visibleItems.map((item) => (
            <BookHorizontalCard
              key={item.id}
              book={item.book}
              badge={item.isFavorite ? "Favori" : statusLabels[item.status]}
              detail={item.book.publisher ?? item.book.publishedDate ?? null}
              onPress={() => navigation.navigate("BookDetails", { bookId: item.book.id })}
            />
          ))
        ) : (
          <EmptyState title="Aucun livre ici" detail="Change de filtre ou ajoute un premier livre depuis la recherche." />
      )}
    </Screen>
  );
}
