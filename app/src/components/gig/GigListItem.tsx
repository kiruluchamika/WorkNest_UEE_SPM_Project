import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatRelativeDate } from "../../utils/formatters";
import type { Gig } from "../../types";

interface GigListItemProps {
  gig: Gig;
  onPress: (gig: Gig) => void;
}

export const GigListItem: React.FC<GigListItemProps> = ({ gig, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(gig)} activeOpacity={0.8} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{gig.title}</Text>
        <View style={styles.row}>
          <Feather name="map-pin" size={12} color={colors.textMuted} />
          <Text style={styles.meta}>{gig.location}</Text>
        </View>
        <Text style={styles.date}>{formatRelativeDate(gig.startDate)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.wage}>{formatCurrency(gig.wage)}</Text>
        <Text style={styles.wageType}>/{gig.wageType}</Text>
        <View style={styles.statusDot} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  date: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  wage: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.success,
  },
  wageType: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginTop: spacing.sm,
  },
});
