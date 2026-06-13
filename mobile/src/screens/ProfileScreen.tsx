import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { BookHorizontalCard, ListCard, ReviewCard } from "../components/Cards";
import { FormInput } from "../components/Controls";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState, ErrorState, LoadingSkeleton, Screen, SectionTitle, StatPill } from "../components/Screen";
import { colors, radius, shadows, spacing, statusLabels } from "../theme";
import type { BookList, LibraryItem, Review, RootStackParamList, User } from "../types";

type ProfilePayload = {
  user: User & { _count: { library: number; reviews: number; followers: number; following: number; lists: number } };
  recentBooks: LibraryItem[];
  recentReviews: Review[];
  favorites: LibraryItem[];
  lists: BookList[];
};

type ProfileSection = "favorites" | "lists" | "recentBooks" | "recentReviews";

export function ProfileScreen() {
  const { token, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [payload, setPayload] = useState<ProfilePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isSavingList, setIsSavingList] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [listTitle, setListTitle] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [listIsPublic, setListIsPublic] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<ProfileSection, boolean>>({
    favorites: false,
    lists: false,
    recentBooks: false,
    recentReviews: false
  });

  function visibleItems<T>(section: ProfileSection, items: T[] = []) {
    return expandedSections[section] ? items : items.slice(0, 5);
  }

  function MoreButton({ section, total }: { section: ProfileSection; total: number }) {
    if (total <= 5) return null;

    return (
      <View style={styles.rowActions}>
        <PrimaryButton
          compact
          label={expandedSections[section] ? "Voir moins" : `Voir plus (${total - 5})`}
          onPress={() => setExpandedSections((current) => ({ ...current, [section]: !current[section] }))}
          tone="ghost"
        />
      </View>
    );
  }

  const load = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const nextPayload = await apiRequest<ProfilePayload>("/api/mobile/profile", { token });
      setPayload(nextPayload);
      setName(nextPayload.user.name ?? "");
      setBio(nextPayload.user.bio ?? "");
      setImage(nextPayload.user.image ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Profil indisponible.");
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

  async function saveProfile() {
    setError("");
    try {
      await apiRequest("/api/mobile/profile", {
        method: "PATCH",
        token,
        body: { name, bio, image }
      });
      setIsEditing(false);
      await load(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profil impossible a enregistrer.");
    }
  }

  async function createList() {
    if (!listTitle.trim()) return;
    setError("");
    setIsSavingList(true);

    try {
      await apiRequest("/api/mobile/lists", {
        method: "POST",
        token,
        body: {
          title: listTitle.trim(),
          description: listDescription.trim() || undefined,
          isPublic: listIsPublic
        }
      });
      setListTitle("");
      setListDescription("");
      setListIsPublic(true);
      setIsCreatingList(false);
      await load(true);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Liste impossible a creer.");
    } finally {
      setIsSavingList(false);
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingSkeleton rows={6} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => load(true)}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Profil lecteur</Text>
        <Text style={styles.name}>{payload?.user.name ?? "Lecteur BookBox"}</Text>
        <Text style={styles.bio}>{payload?.user.bio ?? "Aucune bio pour le moment."}</Text>
        <View style={styles.stats}>
          <StatPill label="Livres" value={payload?.user._count.library ?? 0} />
          <StatPill label="Reviews" value={payload?.user._count.reviews ?? 0} />
          <StatPill label="Followers" value={payload?.user._count.followers ?? 0} />
        </View>
        <View style={styles.rowActions}>
          <PrimaryButton compact label={isEditing ? "Annuler l'edition" : "Modifier le profil"} onPress={() => setIsEditing((current) => !current)} tone="ghost" />
          <PrimaryButton compact label="Notifications" onPress={() => navigation.navigate("Notifications")} tone="ghost" />
          <PrimaryButton compact label="Parametres" onPress={() => navigation.navigate("Settings")} tone="ghost" />
        </View>
      </View>

      {error ? <ErrorState detail={error} title="Profil indisponible" /> : null}

      {isEditing ? (
        <View style={styles.panel}>
          <SectionTitle eyebrow="Profil" title="Edition" />
          <FormInput onChangeText={setName} placeholder="Nom" value={name} />
          <FormInput multiline onChangeText={setBio} placeholder="Bio" value={bio} />
          <FormInput onChangeText={setImage} placeholder="URL avatar" value={image} />
          <PrimaryButton label="Enregistrer" onPress={saveProfile} />
        </View>
      ) : null}

      <SectionTitle eyebrow="Coups de coeur" title="Favoris" />
      {payload?.favorites.length ? (
        <>
          {visibleItems("favorites", payload.favorites).map((item) => (
            <BookHorizontalCard key={item.id} book={item.book} badge="Favori" onPress={() => navigation.navigate("BookDetails", { bookId: item.book.id })} />
          ))}
          <MoreButton section="favorites" total={payload.favorites.length} />
        </>
      ) : (
        <EmptyState title="Pas encore de favoris" />
      )}

      <SectionTitle eyebrow="Collections" title="Listes" />
      <View style={styles.rowActions}>
        <PrimaryButton
          compact
          label={isCreatingList ? "Annuler" : "Nouvelle liste"}
          onPress={() => setIsCreatingList((current) => !current)}
          tone="ghost"
        />
      </View>
      {isCreatingList ? (
        <View style={styles.panel}>
          <FormInput onChangeText={setListTitle} placeholder="Titre de la liste" value={listTitle} />
          <FormInput multiline onChangeText={setListDescription} placeholder="Description optionnelle" value={listDescription} />
          <View style={styles.rowActions}>
            <PrimaryButton compact label={listIsPublic ? "Publique" : "Privee"} onPress={() => setListIsPublic((current) => !current)} tone="ghost" />
            <PrimaryButton compact disabled={!listTitle.trim()} isLoading={isSavingList} label="Creer" onPress={createList} />
          </View>
        </View>
      ) : null}
      {payload?.lists.length ? (
        <>
          {visibleItems("lists", payload.lists).map((list) => (
            <ListCard key={list.id} list={list} onPress={() => navigation.navigate("ListDetails", { listId: list.id })} />
          ))}
          <MoreButton section="lists" total={payload.lists.length} />
        </>
      ) : (
        <EmptyState title="Aucune liste" />
      )}

      <SectionTitle eyebrow="Historique" title="Derniers livres" />
      {payload?.recentBooks.length ? (
        <>
          {visibleItems("recentBooks", payload.recentBooks).map((item) => (
            <BookHorizontalCard
              key={item.id}
              book={item.book}
              badge={statusLabels[item.status]}
              onPress={() => navigation.navigate("BookDetails", { bookId: item.book.id })}
            />
          ))}
          <MoreButton section="recentBooks" total={payload.recentBooks.length} />
        </>
      ) : (
        <EmptyState title="Aucun livre recent" />
      )}

      <SectionTitle eyebrow="Reviews" title="Dernieres reviews" />
      {payload?.recentReviews.length ? (
        <>
          {visibleItems("recentReviews", payload.recentReviews).map((review) => <ReviewCard key={review.id} review={review} />)}
          <MoreButton section="recentReviews" total={payload.recentReviews.length} />
        </>
      ) : (
        <EmptyState title="Aucune review" />
      )}

      <PrimaryButton label="Se deconnecter" onPress={signOut} tone="danger" />
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
    padding: spacing.lg
  },
  kicker: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  name: {
    color: colors.paper,
    fontSize: 30,
    fontWeight: "900"
  },
  bio: {
    color: colors.muted,
    lineHeight: 20
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  rowActions: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
