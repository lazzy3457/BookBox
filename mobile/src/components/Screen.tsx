import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import { colors, radius, spacing } from "../theme";
import { PrimaryButton } from "./PrimaryButton";

type ScreenProps = {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({ children, onRefresh, refreshing = false }: ScreenProps) {
  const scrollRef = React.useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextVisible = event.nativeEvent.contentOffset.y > 520;
    setShowScrollTop((current) => (current === nextVisible ? current : nextVisible));
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mint} /> : undefined
        }
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={styles.root}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
      {showScrollTop ? (
        <Pressable
          accessibilityLabel="Remonter en haut"
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          style={styles.scrollTopButton}
        >
          <Text style={styles.scrollTopText}>↑</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, detail, actionLabel, onAction }: { title: string; detail?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {detail ? <Text style={styles.emptyDetail}>{detail}</Text> : null}
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} tone="ghost" /> : null}
    </View>
  );
}

export function ErrorState({ title = "Une erreur est survenue", detail, onRetry }: { title?: string; detail?: string; onRetry?: () => void }) {
  return (
    <View style={styles.error}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {detail ? <Text style={styles.emptyDetail}>{detail}</Text> : null}
      {onRetry ? <PrimaryButton label="Reessayer" onPress={onRetry} tone="ghost" /> : null}
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

export function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonCover} />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonLineLarge} />
            <View style={styles.skeletonLine} />
          </View>
        </View>
      ))}
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
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.lg
  },
  error: {
    borderColor: colors.coral,
    borderWidth: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    gap: spacing.sm,
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
  },
  statPill: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 82,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  statValue: {
    color: colors.paper,
    fontSize: 18,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2
  },
  skeletonWrap: {
    gap: spacing.md
  },
  skeletonRow: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  skeletonCover: {
    aspectRatio: 2 / 3,
    backgroundColor: colors.panelSoft,
    borderRadius: radius.sm,
    width: 58
  },
  skeletonBody: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center"
  },
  skeletonLineLarge: {
    backgroundColor: colors.panelSoft,
    borderRadius: radius.sm,
    height: 16,
    width: "80%"
  },
  skeletonLine: {
    backgroundColor: colors.panelSoft,
    borderRadius: radius.sm,
    height: 12,
    width: "55%"
  },
  scrollTopButton: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderColor: colors.ink,
    borderRadius: 999,
    borderWidth: 2,
    bottom: 26,
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: 18,
    width: 48
  },
  scrollTopText: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26
  }
});
