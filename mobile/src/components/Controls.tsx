import React from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, statusLabels } from "../theme";
import type { ReadingStatus } from "../types";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmentWrap}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.segment, value === option.value ? styles.segmentActive : null]}
        >
          <Text style={[styles.segmentText, value === option.value ? styles.segmentTextActive : null]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function StatusSelector({ value, onChange }: { value?: ReadingStatus | null; onChange: (value: ReadingStatus) => void }) {
  return (
    <View style={styles.statusGrid}>
      {(Object.keys(statusLabels) as ReadingStatus[]).map((status) => (
        <Pressable key={status} onPress={() => onChange(status)} style={[styles.status, value === status ? styles.statusActive : null]}>
          <Text style={[styles.statusText, value === status ? styles.statusTextActive : null]}>{statusLabels[status]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function RatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.ratingWrap}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable key={rating} onPress={() => onChange(rating)} style={[styles.ratingButton, value >= rating ? styles.ratingActive : null]}>
          <Text style={[styles.ratingText, value >= rating ? styles.ratingTextActive : null]}>{String.fromCharCode(9733)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function FormInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  secureTextEntry,
  keyboardType
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
}) {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.inputWrap}>
      <TextInput
        autoCapitalize={keyboardType === "email-address" ? "none" : undefined}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        secureTextEntry={isPassword && !passwordVisible}
        style={[styles.input, multiline ? styles.multiline : null, isPassword ? styles.inputWithEye : null]}
        textAlignVertical={multiline ? "top" : undefined}
        value={value}
      />
      {isPassword ? (
        <Pressable
          accessibilityLabel={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          onPress={() => setPasswordVisible((current) => !current)}
          style={styles.eyeButton}
        >
          <Image
            resizeMode="contain"
            source={passwordVisible ? require("../assets/icons/eye-open.png") : require("../assets/icons/eye-closed.png")}
            style={styles.eyeImage}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  segment: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  segmentActive: {
    backgroundColor: colors.mint,
    borderColor: colors.mint
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: colors.ink
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  status: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: "47%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  statusActive: {
    backgroundColor: colors.mint,
    borderColor: colors.mint
  },
  statusText: {
    color: colors.paper,
    fontWeight: "900",
    textAlign: "center"
  },
  statusTextActive: {
    color: colors.ink
  },
  ratingWrap: {
    flexDirection: "row",
    gap: spacing.sm
  },
  ratingButton: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  ratingActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amber
  },
  ratingText: {
    color: colors.paper,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22
  },
  ratingTextActive: {
    color: colors.ink
  },
  inputWrap: {
    justifyContent: "center"
  },
  input: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.paper,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 13
  },
  inputWithEye: {
    paddingRight: 54
  },
  eyeButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    width: 44
  },
  eyeImage: {
    height: 24,
    tintColor: colors.mint,
    width: 24
  },
  multiline: {
    minHeight: 110
  }
});

