import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius } from "../theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  tone?: "primary" | "ghost" | "danger";
  compact?: boolean;
};

export function PrimaryButton({ label, onPress, disabled, isLoading, tone = "primary", compact }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={[styles.button, compact ? styles.compact : null, styles[tone], disabled || isLoading ? styles.disabled : null]}
    >
      {isLoading ? (
        <ActivityIndicator color={tone === "primary" ? colors.ink : colors.paper} />
      ) : (
        <Text style={[styles.label, tone === "primary" ? styles.primaryLabel : tone === "danger" ? styles.dangerLabel : styles.ghostLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13
  },
  compact: {
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primary: {
    backgroundColor: colors.mint,
    borderColor: colors.mint
  },
  ghost: {
    backgroundColor: colors.panel,
    borderColor: colors.line
  },
  danger: {
    backgroundColor: "transparent",
    borderColor: colors.coral
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    fontWeight: "900"
  },
  primaryLabel: {
    color: colors.ink
  },
  ghostLabel: {
    color: colors.paper
  },
  dangerLabel: {
    color: colors.coral
  }
});
