import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { apiBaseUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen, SectionTitle } from "../components/Screen";
import { colors, radius, shadows, spacing } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>BookBox</Text>
        <Text style={styles.title}>Parametres</Text>
        <Text style={styles.detail}>Gere ton compte mobile et les infos de connexion de l'application.</Text>
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="Compte" title="Profil connecte" />
        <View style={styles.row}>
          <Text style={styles.label}>Nom</Text>
          <Text style={styles.value}>{user?.name ?? "Lecteur BookBox"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? "Non renseigne"}</Text>
        </View>
        <PrimaryButton label="Retour au profil" onPress={() => navigation.goBack()} tone="ghost" />
      </View>

      <View style={styles.panel}>
        <SectionTitle eyebrow="Application" title="Configuration" />
        <View style={styles.row}>
          <Text style={styles.label}>API</Text>
          <Text numberOfLines={2} style={styles.value}>{apiBaseUrl}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Version Expo</Text>
          <Text style={styles.value}>SDK 54</Text>
        </View>
      </View>

      <View style={styles.panelDanger}>
        <SectionTitle eyebrow="Session" title="Connexion" />
        <Text style={styles.detail}>Tu peux fermer ta session mobile ici. Tes livres et reviews restent sauvegardes.</Text>
        <PrimaryButton label="Se deconnecter" onPress={signOut} tone="danger" />
      </View>
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
  title: {
    color: colors.paper,
    fontSize: 31,
    fontWeight: "900"
  },
  detail: {
    color: colors.muted,
    lineHeight: 21
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  panelDanger: {
    backgroundColor: colors.panel,
    borderColor: colors.coral,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  row: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingBottom: spacing.md
  },
  label: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  value: {
    color: colors.paper,
    fontSize: 15,
    fontWeight: "800"
  }
});
