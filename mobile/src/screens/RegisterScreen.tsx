import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { FormInput } from "../components/Controls";
import { PrimaryButton } from "../components/PrimaryButton";
import { ErrorState, Screen } from "../components/Screen";
import { colors, radius, shadows, spacing } from "../theme";
import type { AuthStackParamList } from "../types";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setMessage("");

    try {
      await signUp({ name, username, email, password });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Inscription impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.brand}>BookBox</Text>
        <Text style={styles.heroTitle}>Construis ta bibliotheque sociale.</Text>
        <Text style={styles.heroText}>Un compte suffit pour ajouter des livres, publier des reviews et suivre des lecteurs.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Inscription</Text>
        <FormInput onChangeText={setName} placeholder="Nom" value={name} />
        <FormInput onChangeText={setUsername} placeholder="Pseudo" value={username} />
        <FormInput keyboardType="email-address" onChangeText={setEmail} placeholder="Email" value={email} />
        <FormInput onChangeText={setPassword} placeholder="Mot de passe" secureTextEntry value={password} />
        <PrimaryButton isLoading={isSubmitting} label="Creer mon compte" onPress={submit} />
        {message ? <ErrorState detail={message} title="Inscription impossible" /> : null}
        <PrimaryButton label="J'ai deja un compte" onPress={() => navigation.navigate("Login")} tone="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    paddingTop: spacing.xl
  },
  heroTitle: {
    color: colors.paper,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38
  },
  heroText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  brand: {
    color: colors.mint,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: colors.paper,
    fontSize: 30,
    fontWeight: "900"
  },
});
