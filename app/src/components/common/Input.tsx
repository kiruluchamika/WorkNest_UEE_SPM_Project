import React from "react";
import { View, TextInput, Text, StyleSheet, TextInputProps } from "react-native";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  multiline = false,
  rows = 1,
  style,
  ...textInputProps
}) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          multiline && { height: rows * 24 + spacing.md * 2, textAlignVertical: "top" },
          error ? { borderColor: colors.danger } : null,
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        {...textInputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.cream,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
