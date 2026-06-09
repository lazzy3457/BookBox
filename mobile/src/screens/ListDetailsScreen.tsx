import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookHorizontalCard, ReviewCard } from "../components/Cards";
import { FormInput } from "../components/Controls";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle } from "../components/Screen";
import { colors, radius, shadows, spacing } from "../theme";
import type { BookList, Review, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "ListDetails">;

export function ListDetailsScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const [list, setList] = useState<BookList | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  async function load(refreshing = false) {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const payload = await apiRequest<{ list: BookList; canManage: boolean }>(`/api/mobile/lists/${route.params.listId}`, { token });
      setList(payload.list);
      setCanManage(payload.canManage);
      setReviews((payload.list.entries ?? []).flatMap((entry) => entry.book.reviews ?? []));
      setTitle(payload.list.title);
      setDescription(payload.list.description ?? "");
      setIsPublic(payload.list.isPublic);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Liste indisponible.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [route.params.listId, token]);

  async function saveList() {
    if (!title.trim()) return;
    setIsSaving(true);
    setError("");

    try {
      const payload = await apiRequest<{ list: BookList }>(`/api/mobile/lists/${route.params.listId}`, {
        method: "PATCH",
        token,
        body: { title: title.trim(), description: description.trim() || undefined, isPublic }
      });
      setList(payload.list);
      setReviews((payload.list.entries ?? []).flatMap((entry) => entry.book.reviews ?? []));
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Liste impossible a enregistrer.");
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDeleteList() {
    Alert.alert("Supprimer la liste", "Cette action retirera la liste de ton profil.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          setIsSaving(true);
          try {
            await apiRequest(`/api/mobile/lists/${route.params.listId}`, { method: "DELETE", token });
            navigation.goBack();
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Suppression impossible.");
          } finally {
            setIsSaving(false);
          }
        }
      }
    ]);
  }

  async function removeBook(bookId: string) {
    setIsSaving(true);
    setError("");

    try {
      await apiRequest(`/api/mobile/lists/${route.params.listId}/books?bookId=${encodeURIComponent(bookId)}`, { method: "DELETE", token });
      await load(true);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Livre impossible a retirer.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingSkeleton rows={5} />
      </Screen>
    );
  }

  if (!list) {
    return (
      <Screen>
        <ErrorState detail={error} title="Liste indisponible" />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => load(true)} refreshing={isRefreshing}>
      {error ? <ErrorState detail={error} title="Liste indisponible" onRetry={() => load()} /> : null}
      <View style={styles.header}>
        <View style={styles.coverStrip}>
          {(list.entries ?? []).slice(0, 6).map((entry) => (
            <View key={entry.id} style={styles.stripItem}>
              {entry.book.thumbnailUrl ? <Image source={{ uri: entry.book.thumbnailUrl }} style={styles.image} /> : null}
            </View>
          ))}
        </View>
        <Text style={styles.kicker}>{list.isPublic ? "Liste publique" : "Liste privee"}</Text>
        <Text style={styles.title}>{list.title}</Text>
        {list.description ? <Text style={styles.description}>{list.description}</Text> : null}
        {canManage ? (
          <View style={styles.actions}>
            <PrimaryButton compact label={isEditing ? "Fermer" : "Modifier"} onPress={() => setIsEditing((current) => !current)} tone="ghost" />
            <PrimaryButton compact isLoading={isSaving} label="Supprimer" onPress={confirmDeleteList} tone="danger" />
          </View>
        ) : null}
      </View>
      {isEditing ? (
        <View style={styles.panel}>
          <FormInput onChangeText={setTitle} placeholder="Titre" value={title} />
          <FormInput multiline onChangeText={setDescription} placeholder="Description" value={description} />
          <View style={styles.actions}>
            <PrimaryButton compact label={isPublic ? "Publique" : "Privee"} onPress={() => setIsPublic((current) => !current)} tone="ghost" />
            <PrimaryButton compact disabled={!title.trim()} isLoading={isSaving} label="Enregistrer" onPress={saveList} />
          </View>
        </View>
      ) : null}
      <SectionTitle eyebrow={`${list.entries?.length ?? 0} livres`} title="Livres de la liste" />
      {list.entries?.length ? list.entries.map((entry) => (
        <BookHorizontalCard
          key={entry.id}
          actionLabel={canManage ? "Retirer" : undefined}
          book={entry.book}
          detail={entry.note}
          isLoading={isSaving}
          onAction={canManage ? () => removeBook(entry.book.id) : undefined}
          onPress={() => navigation.navigate("BookDetails", { bookId: entry.book.id })}
        />
      )) : <EmptyState title="Liste vide" />}

      <SectionTitle eyebrow={`${reviews.length} reviews`} title="Reviews des livres" />
      {reviews.length ? reviews.map((review) => <ReviewCard key={review.id} review={review} />) : <EmptyState title="Aucune review dans cette liste" />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    ...shadows.card,
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.lg
  },
  coverStrip: {
    flexDirection: "row",
    height: 118,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg
  },
  stripItem: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.ink,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden"
  },
  image: {
    height: "100%",
    width: "100%"
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
  },
  actions: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  }
});
