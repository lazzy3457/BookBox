import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { FormInput } from "../components/Controls";
import { PrimaryButton } from "../components/PrimaryButton";
import { ErrorState, Screen } from "../components/Screen";
import { colors, radius, shadows, spacing } from "../theme";
import type { AuthStackParamList } from "../types";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setMessage("");

    try {
      await signIn(email, password);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.brand}>BookBox</Text>
        <Text style={styles.heroTitle}>Retrouve tes lectures, tes reviews et ton cercle.</Text>
        <Text style={styles.heroText}>Une app sociale pour noter, classer et decouvrir des livres.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Connexion</Text>
        <FormInput keyboardType="email-address" onChangeText={setEmail} placeholder="Email" value={email} />
        <FormInput onChangeText={setPassword} placeholder="Mot de passe" secureTextEntry value={password} />
        <PrimaryButton isLoading={isSubmitting} label="Se connecter" onPress={submit} />
        {message ? <ErrorState detail={message} title="Connexion impossible" /> : null}
        <PrimaryButton label="Creer un compte" onPress={() => navigation.navigate("Register")} tone="ghost" />
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
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40
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
