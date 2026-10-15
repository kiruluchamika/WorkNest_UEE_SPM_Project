import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
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
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.option, value === true && styles.optionSelectedYes]}
          onPress={() => onChange(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Yes"
          accessibilityState={{ selected: value === true }}
        >
          <Feather
            name="check"
            size={16}
            color={value === true ? colors.textInverse : colors.textMuted}
          />
          <Text style={[styles.optionText, value === true && styles.optionTextSelected]}>
            Yes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, value === false && styles.optionSelectedNo]}
          onPress={() => onChange(false)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="No"
          accessibilityState={{ selected: value === false }}
        >
          <Feather
            name="x"
            size={16}
            color={value === false ? colors.textInverse : colors.textMuted}
          />
          <Text style={[styles.optionText, value === false && styles.optionTextSelected]}>
            No
          </Text>
        </TouchableOpacity>
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
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelectedYes: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  optionSelectedNo: {
    backgroundColor: colors.textSecondary,
    borderColor: colors.textSecondary,
  },
  optionText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.textInverse,
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
