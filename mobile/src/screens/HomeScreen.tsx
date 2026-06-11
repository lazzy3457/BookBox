import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { ActivityCard, BookPosterCard } from "../components/Cards";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle } from "../components/Screen";
import { colors, radius, shadows, spacing } from "../theme";
import type { ActivityItem, Book, RootStackParamList } from "../types";

type HomePayload = {
  trending: Book[];
  activity: ActivityItem[];
};

export function HomeScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const visibleActivity = showAllActivity ? payload?.activity ?? [] : (payload?.activity ?? []).slice(0, 5);

  const load = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError("");

    try {
      const nextPayload = await apiRequest<HomePayload>("/api/mobile/home", { token });
      setPayload(nextPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Accueil indisponible.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      load().finally(() => {
        if (!isMounted) setIsLoading(false);
      });
      return () => {
        isMounted = false;
      };
    }, [load])
  );

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.kicker}>BooksBox mobile</Text>
          <Text style={styles.heroTitle}>Ton carnet de lecture dans ta poche.</Text>
        </View>
        <LoadingSkeleton rows={5} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => load(true)}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>BooksBox mobile</Text>
        <Text style={styles.heroTitle}>Ton carnet de lecture dans ta poche.</Text>
        <Text style={styles.heroText}>Ajoute, note et partage tes lectures avec ton cercle.</Text>
        <PrimaryButton label="J'ai fini un livre" onPress={() => navigation.navigate("Main", { screen: "Search" } as never)} />
      </View>

      {error ? <ErrorState detail={error} onRetry={() => load()} title="Accueil indisponible" /> : null}

      <SectionTitle eyebrow="Rayon actif" title="Tendances" />
      {payload?.trending.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRail}>
          {payload.trending.slice(0, 10).map((book) => (
            <BookPosterCard key={book.id} book={book} badge="Hot" onPress={() => navigation.navigate("BookDetails", { bookId: book.id })} />
          ))}
        </ScrollView>
      ) : (
        <EmptyState title="Pas encore de tendances" detail="Les livres actifs apparaitront apres les premiers ajouts." />
      )}

      <SectionTitle eyebrow="Social" title="Activite des amis" />
      {payload?.activity.length ? (
        <>
          {visibleActivity.map((item) => (
            <ActivityCard key={item.id} item={item} onBookPress={(bookId) => navigation.navigate("BookDetails", { bookId })} />
          ))}
          {payload.activity.length > 5 ? (
            <View style={styles.moreButton}>
              <PrimaryButton
                compact
                label={showAllActivity ? "Voir moins" : `Voir plus (${payload.activity.length - 5})`}
                onPress={() => setShowAllActivity((current) => !current)}
                tone="ghost"
              />
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="Feed calme"
          detail="Suis des lecteurs pour voir leurs lectures et reviews ici."
          actionLabel="Trouver des lecteurs"
          onAction={() => navigation.navigate("Main", { screen: "Community" } as never)}
        />
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
    gap: spacing.sm,
    padding: spacing.lg
  },
  kicker: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  heroTitle: {
    color: colors.paper,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36
  },
  heroText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  posterRail: {
    gap: spacing.md,
    paddingRight: spacing.lg
  },
  moreButton: {
    alignItems: "flex-start"
  }
});
