import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookRow } from "../components/BookRow";
import { LoadingState, Screen, SectionTitle } from "../components/Screen";
import { colors, spacing } from "../theme";
import type { BookList, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "ListDetails">;

export function ListDetailsScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const [list, setList] = useState<BookList | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ list: BookList }>(`/api/mobile/lists/${route.params.listId}`, { token })
      .then((payload) => setList(payload.list))
      .finally(() => setIsLoading(false));
  }, [route.params.listId, token]);

  if (isLoading || !list) return <LoadingState />;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>{list.isPublic ? "Liste publique" : "Liste privee"}</Text>
        <Text style={styles.title}>{list.title}</Text>
        {list.description ? <Text style={styles.description}>{list.description}</Text> : null}
      </View>
      <SectionTitle eyebrow={`${list.entries?.length ?? 0} livres`} title="Livres de la liste" />
      {list.entries?.map((entry) => (
        <BookRow key={entry.id} book={entry.book} onPress={() => navigation.navigate("BookDetails", { bookId: entry.book.id })} />
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
  }
});
