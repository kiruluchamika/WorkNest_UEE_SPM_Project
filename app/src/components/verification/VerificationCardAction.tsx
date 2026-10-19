import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";

// The containing card owns the existing press action. This visual cue does not
// introduce a nested touch target or a second navigation handler.
export function VerificationCardAction({ compact = false }: { compact?: boolean }) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={compact ? styles.inline : styles.footer}>
    <View style={[styles.pill, compact && styles.compactPill]}>
      <Text style={styles.label}>{compact ? "View" : "View Details"}</Text>
      <Feather name="arrow-right" size={14} color={colors.textInverse}/>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: spacing.md, paddingTop: spacing.sm + spacing.xs, alignItems: "flex-end" },
  inline: { flexShrink: 0 },
  pill: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primaryDark, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 36 },
  compactPill: { paddingHorizontal: spacing.sm + spacing.xs },
  label: { color: colors.textInverse, fontSize: 12, lineHeight: 18, fontWeight: "700" },
});
