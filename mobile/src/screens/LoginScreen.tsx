import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { colors, spacing } from "../theme";
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
      <View style={styles.card}>
        <Text style={styles.brand}>BookBox</Text>
        <Text style={styles.title}>Connexion</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={email}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Mot de passe"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <PrimaryButton disabled={isSubmitting} label={isSubmitting ? "Connexion..." : "Se connecter"} onPress={submit} />
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <PrimaryButton label="Creer un compte" onPress={() => navigation.navigate("Register")} tone="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: 70,
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
  input: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderWidth: 1,
    color: colors.paper,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13
  },
  error: {
    color: colors.coral,
    lineHeight: 20
  }
});
