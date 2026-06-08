import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {detail ? <Text style={styles.emptyDetail}>{detail}</Text> : null}
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.mint} />
    </View>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 120
  },
  empty: {
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.panel,
    padding: spacing.lg
  },
  emptyTitle: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: "900"
  },
  emptyDetail: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.ink,
    flex: 1,
    justifyContent: "center"
  },
  sectionTitle: {
    gap: 4
  },
  eyebrow: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: colors.paper,
    fontSize: 26,
    fontWeight: "900"
  }
});
