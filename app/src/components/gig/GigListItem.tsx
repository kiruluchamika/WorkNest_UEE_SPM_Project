import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatRelativeDate } from "../../utils/formatters";
import type { Gig } from "../../types";

interface GigListItemProps {
  gig: Gig;
  onPress: (gig: Gig) => void;
}

export const GigListItem: React.FC<GigListItemProps> = ({ gig, onPress }) => {
  return (
    <TouchableOpacity
      onPress={() => onPress(gig)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${gig.title}, ${gig.location}`}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {gig.title}
        </Text>
        <View style={styles.row}>
          <Feather name="map-pin" size={12} color={colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {gig.location}
          </Text>
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
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  meta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: 4,
  },
  date: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  wage: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.successText,
  },
  wageType: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.successText,
    marginTop: spacing.xs,
  },
});
