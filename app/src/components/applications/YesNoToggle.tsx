import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

interface YesNoToggleProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  error?: string;
}

export const YesNoToggle: React.FC<YesNoToggleProps> = ({ value, onChange, error }) => {
  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.option, value === true && styles.optionSelected]}
          onPress={() => onChange(true)}
        >
          <Text style={[styles.optionText, value === true && styles.optionTextSelected]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, value === false && styles.optionSelected]}
          onPress={() => onChange(false)}
        >
          <Text style={[styles.optionText, value === false && styles.optionTextSelected]}>No</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.textInverse,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
