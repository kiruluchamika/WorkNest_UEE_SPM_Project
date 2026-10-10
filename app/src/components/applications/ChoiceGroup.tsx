import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface ChoiceGroupProps {
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

export const ChoiceGroup: React.FC<ChoiceGroupProps> = ({ options, value, onChange, error }) => {
  return (
    <View style={styles.container}>
      <View style={styles.optionsWrap}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onChange(option)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  optionsWrap: {
    gap: spacing.xs + 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryLight,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  radioOuterSelected: {
    borderColor: colors.primaryDark,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDark,
  },
  optionText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
    flex: 1,
  },
  optionTextSelected: {
    color: colors.text,
    fontWeight: "700",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: 4,
  },
  error: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    fontWeight: "600",
  },
});
