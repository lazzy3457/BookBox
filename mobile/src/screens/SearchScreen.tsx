import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookHorizontalCard } from "../components/Cards";
import { FormInput, StatusSelector } from "../components/Controls";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle } from "../components/Screen";
import { colors, radius, spacing, statusLabels } from "../theme";
import type { Book, ReadingStatus, RootStackParamList } from "../types";

export function SearchScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Book[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus>("READ");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  function bookKey(book: Book) {
    return book.externalId ?? book.googleBooksVolumeId ?? book.openLibraryKey ?? book.id ?? `${book.source}-${book.title}`;
  }

  async function search() {
    if (query.trim().length < 2) return;
    setIsLoading(true);
    setMessage("");

    try {
      const payload = await apiRequest<{ items: Book[] }>(`/api/books/search?q=${encodeURIComponent(query)}&pageSize=20`);
      setItems(payload.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recherche impossible.");
    } finally {
      setIsLoading(false);
    }
  }

  async function importBook(candidate: Book) {
    setMessage("");
    setSavingId(bookKey(candidate));

    try {
      const book = await apiRequest<Book>("/api/books", {
        method: "POST",
        token,
        body: candidate
      });
      await apiRequest("/api/library", {
        method: "POST",
        token,
        body: { bookId: book.id, status: selectedStatus }
      });
      navigation.navigate("BookDetails", { bookId: book.id });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import impossible.");
    } finally {
      setSavingId(null);
    }
  }

  async function openBook(candidate: Book) {
    setMessage("");
    setOpeningId(bookKey(candidate));

    try {
      const book = await apiRequest<Book>("/api/books", {
        method: "POST",
        token,
        body: candidate
      });
      navigation.navigate("BookDetails", { bookId: book.id });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ouverture impossible.");
    } finally {
      setOpeningId(null);
    }
  }

  async function createManualBook() {
    if (!manualTitle.trim() || !manualAuthor.trim()) {
      setMessage("Titre et auteur sont obligatoires.");
      return;
    }

    await importBook({
      id: `manual-${manualTitle}`,
      title: manualTitle.trim(),
      authors: manualAuthor.split(",").map((author) => author.trim()).filter(Boolean)
    });
  }

  return (
    <Screen>
      <SectionTitle eyebrow="Catalogue" title="Recherche" />
      <View style={styles.panel}>
        <FormInput onChangeText={setQuery} placeholder="Titre, auteur, ISBN" value={query} />
        <Text style={styles.helper}>Le livre sera ajoute avec le statut choisi.</Text>
        <StatusSelector value={selectedStatus} onChange={setSelectedStatus} />
        <PrimaryButton isLoading={isLoading} label="Chercher" onPress={search} />
      </View>
      {message ? <ErrorState detail={message} title="Action impossible" /> : null}
      {isLoading ? <LoadingSkeleton rows={4} /> : null}
      {!isLoading && items.length ? (
        items.map((book) => {
          const key = bookKey(book);
          return (
            <BookHorizontalCard
              key={key}
              actionLabel={`Ajouter: ${statusLabels[selectedStatus]}`}
              badge={book.source === "open_library" ? "Open Library" : book.source === "google_books" ? "Google" : null}
              book={book}
              detail={openingId === key ? "Ouverture de la fiche..." : book.publisher ?? book.language?.toUpperCase() ?? null}
              isLoading={savingId === key}
              onAction={() => importBook(book)}
              onPress={() => openBook(book)}
            />
          );
        })
      ) : (
        !isLoading ? (
          <EmptyState
            title="Cherche un livre"
            detail="Google Books et Open Library alimentent les resultats. Si rien ne correspond, ajoute le livre a la main."
            actionLabel={manualOpen ? "Masquer l'ajout manuel" : "Ajouter manuellement"}
            onAction={() => setManualOpen((current) => !current)}
          />
        ) : null
      )}
      {manualOpen ? (
        <View style={styles.panel}>
          <SectionTitle eyebrow="Fallback" title="Ajout manuel" />
          <FormInput onChangeText={setManualTitle} placeholder="Titre du livre" value={manualTitle} />
          <FormInput onChangeText={setManualAuthor} placeholder="Auteur(s), separes par une virgule" value={manualAuthor} />
          <PrimaryButton isLoading={savingId?.startsWith("manual")} label={`Creer et ajouter: ${statusLabels[selectedStatus]}`} onPress={createManualBook} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20
  }
});
