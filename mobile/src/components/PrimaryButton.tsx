import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "ghost" | "danger";
};

export function PrimaryButton({ label, onPress, disabled, tone = "primary" }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[tone], disabled ? styles.disabled : null]}
    >
      <Text style={[styles.label, tone === "primary" ? styles.primaryLabel : styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13
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
  }
});
