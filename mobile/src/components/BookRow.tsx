import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";
import type { Book } from "../types";

type BookRowProps = {
  book: Book;
  badge?: string | null;
  onPress?: () => void;
};

export function BookRow({ book, badge, onPress }: BookRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.cover}>
        {book.thumbnailUrl ? <Image source={{ uri: book.thumbnailUrl }} style={styles.image} /> : <Text style={styles.coverText}>BB</Text>}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {book.authors?.join(", ") || "Auteur inconnu"}
        </Text>
        {book.publishedDate ? <Text style={styles.muted}>{book.publishedDate}</Text> : null}
      </View>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  cover: {
    alignItems: "center",
    aspectRatio: 2 / 3,
    backgroundColor: colors.panelSoft,
    justifyContent: "center",
    overflow: "hidden",
    width: 54
  },
  image: {
    height: "100%",
    width: "100%"
  },
  coverText: {
    color: colors.mint,
    fontWeight: "900"
  },
  body: {
    flex: 1,
    gap: 3
  },
  title: {
    color: colors.paper,
    fontSize: 15,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 13
  },
  muted: {
    color: colors.muted,
    fontSize: 12
  },
  badge: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: "900"
  }
});
