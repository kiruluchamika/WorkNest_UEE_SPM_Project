import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
    <View>
      {options.map((option) => {
        const selected = option === value;
        return (
          <TouchableOpacity key={option} style={styles.row} onPress={() => onChange(option)} activeOpacity={0.8}>
            <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
              {selected ? <View style={styles.radioInner} /> : null}
            </View>
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
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
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: "600",
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
