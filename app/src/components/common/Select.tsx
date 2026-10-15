import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";

export interface SelectOption {
  value: string;
  label: string;
  helperText?: string;
}

interface SelectProps {
  label?: string;
  labelStyle?: StyleProp<TextStyle>;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  emptyMessage?: string;
  triggerStyle?: StyleProp<ViewStyle>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  labelStyle,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  error,
  emptyMessage = "No options available",
  triggerStyle,
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.trigger, triggerStyle, error ? { borderColor: colors.danger } : null]}
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || "Select an option"}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeButton}>
                <Feather name="x" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
            {options.length === 0 ? (
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            ) : (
              <ScrollView style={{ maxHeight: 340 }}>
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                          {option.label}
                        </Text>
                        {option.helperText ? (
                          <Text style={styles.optionHelper}>{option.helperText}</Text>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <Feather name="check" size={16} color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  trigger: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.cream,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  placeholder: {
    color: colors.textMuted,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 42, 46, 0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    ...shadows.medium,
    shadowColor: colors.shadow,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  optionSelected: {
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  optionHelper: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
