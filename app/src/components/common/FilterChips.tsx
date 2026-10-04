import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: keyof typeof Feather.glyphMap;
}

interface FilterChipsProps<T extends string = string> {
  options: FilterOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function FilterChips<T extends string = string>({
  options,
  selected,
  onSelect,
  style,
  contentContainerStyle,
}: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
    >
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${option.label}${option.count !== undefined ? `, ${option.count}` : ""}`}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            {option.icon ? (
              <Feather
                name={option.icon}
                size={13}
                color={isSelected ? colors.textInverse : colors.textMuted}
                style={styles.icon}
              />
            ) : null}
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <View
                style={[
                  styles.countBadge,
                  isSelected && styles.countBadgeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isSelected && styles.countTextSelected,
                  ]}
                >
                  {option.count}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  content: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.textInverse,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.neutralLight,
  },
  countBadgeSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  countText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  countTextSelected: {
    color: colors.textInverse,
  },
});
