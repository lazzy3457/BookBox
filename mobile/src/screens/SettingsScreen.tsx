import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { apiBaseUrl, apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { ErrorState, Screen, SectionTitle } from "../components/Screen";
import { getPushPermissionStatus, registerForPushNotifications } from "../notifications/push";
import { colors, radius, shadows, spacing } from "../theme";
import type { NotificationPreference, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { token, user, signOut } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>("inconnu");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      if (!token) return;

      try {
        const [payload, permission] = await Promise.all([
          apiRequest<{ preferences: NotificationPreference }>("/api/mobile/notification-preferences", { token }),
          getPushPermissionStatus().catch(() => "inconnu")
        ]);

        if (!cancelled) {
          setPreferences(payload.preferences);
          setPermissionStatus(permission);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Preferences indisponibles.");
        }
      }
    }

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function updatePreference(key: keyof Pick<NotificationPreference, "enabled" | "likesEnabled" | "commentsEnabled" | "friendReviewsEnabled">) {
    if (!token || !preferences) return;

    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(nextPreferences);
    setIsSaving(true);
    setError("");

    try {
      const payload = await apiRequest<{ preferences: NotificationPreference }>("/api/mobile/notification-preferences", {
        method: "PATCH",
        token,
        body: { [key]: nextPreferences[key] }
      });
      setPreferences(payload.preferences);

      if (key === "enabled" && payload.preferences.enabled) {
        const result = await registerForPushNotifications(token, payload.preferences);
        setPermissionStatus(result.status === "registered" ? "granted" : result.status);
      }
    } catch (saveError) {
      setPreferences(preferences);
      setError(saveError instanceof Error ? saveError.message : "Preference impossible a enregistrer.");
    } finally {
      setIsSaving(false);
    }
  }

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

      <View style={styles.panel}>
        <SectionTitle eyebrow="Notifications" title="Alertes sociales" />
        {error ? <ErrorState detail={error} title="Notifications indisponibles" /> : null}
        <Text style={styles.detail}>Permission telephone: {permissionStatus}</Text>
        <PreferenceRow
          disabled={!preferences || isSaving}
          label="Notifications"
          value={Boolean(preferences?.enabled)}
          onChange={() => updatePreference("enabled")}
        />
        <PreferenceRow
          disabled={!preferences || isSaving || !preferences.enabled}
          label="Likes"
          value={Boolean(preferences?.likesEnabled)}
          onChange={() => updatePreference("likesEnabled")}
        />
        <PreferenceRow
          disabled={!preferences || isSaving || !preferences.enabled}
          label="Commentaires et reponses"
          value={Boolean(preferences?.commentsEnabled)}
          onChange={() => updatePreference("commentsEnabled")}
        />
        <PreferenceRow
          disabled={!preferences || isSaving || !preferences.enabled}
          label="Reviews d'amis"
          value={Boolean(preferences?.friendReviewsEnabled)}
          onChange={() => updatePreference("friendReviewsEnabled")}
        />
        <PrimaryButton label="Voir les notifications" onPress={() => navigation.navigate("Notifications")} tone="ghost" />
      </View>

      <View style={styles.panelDanger}>
        <SectionTitle eyebrow="Session" title="Connexion" />
        <Text style={styles.detail}>Tu peux fermer ta session mobile ici. Tes livres et reviews restent sauvegardes.</Text>
        <PrimaryButton label="Se deconnecter" onPress={signOut} tone="danger" />
      </View>
    </Screen>
  );
}

function PreferenceRow({ label, value, disabled, onChange }: { label: string; value: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.value}>{label}</Text>
      <Switch
        disabled={disabled}
        onValueChange={onChange}
        thumbColor={value ? colors.ink : colors.muted}
        trackColor={{ false: colors.panelSoft, true: colors.mint }}
        value={value}
      />
    </View>
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
  switchRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
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
