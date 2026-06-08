import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookRow } from "../components/BookRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState, Screen, SectionTitle } from "../components/Screen";
import { colors, spacing } from "../theme";
import type { Book, RootStackParamList } from "../types";

export function SearchScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Book[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      const book = await apiRequest<Book>("/api/books", {
        method: "POST",
        token,
        body: candidate
      });
      navigation.navigate("BookDetails", { bookId: book.id });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import impossible.");
    }
  }

  return (
    <Screen>
      <SectionTitle eyebrow="Catalogue" title="Recherche" />
      <View style={styles.searchBar}>
        <TextInput
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Titre, auteur, ISBN"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
        <PrimaryButton disabled={isLoading} label={isLoading ? "..." : "Chercher"} onPress={search} />
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {items.length ? (
        items.map((book) => <BookRow key={`${book.source}-${book.id ?? book.title}`} book={book} badge="Importer" onPress={() => importBook(book)} />)
      ) : (
        <EmptyState title="Cherche un livre" detail="Google Books et Open Library alimentent les resultats." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    gap: spacing.sm
  },
  input: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    color: colors.paper,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13
  },
  message: {
    color: colors.coral,
    lineHeight: 20
  }
});
