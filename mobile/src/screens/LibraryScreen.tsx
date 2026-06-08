import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookRow } from "../components/BookRow";
import { EmptyState, LoadingState, Screen, SectionTitle } from "../components/Screen";
import type { LibraryItem, RootStackParamList } from "../types";

export function LibraryScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);
      apiRequest<{ items: LibraryItem[] }>("/api/library", { token })
        .then((payload) => {
          if (isMounted) setItems(payload.items);
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
      <SectionTitle eyebrow="Personnel" title="Bibliotheque" />
      <View>
        {items.length ? (
          items.map((item) => (
            <BookRow
              key={item.id}
              book={item.book}
              badge={item.isFavorite ? "Favori" : item.status}
              onPress={() => navigation.navigate("BookDetails", { bookId: item.book.id })}
            />
          ))
        ) : (
          <EmptyState title="Bibliotheque vide" detail="Ajoute un premier livre depuis la recherche." />
        )}
      </View>
    </Screen>
  );
}
