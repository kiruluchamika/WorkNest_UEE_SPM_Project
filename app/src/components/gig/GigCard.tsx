import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "../common/Card";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatRelativeDate } from "../../utils/formatters";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import type { GigPost } from "../../types";
import { TrustBadge } from "../trust/TrustBadge";

interface GigCardProps {
  gig: GigPost;
  onPress: (gig: GigPost) => void;
}

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

export const GigCard: React.FC<GigCardProps> = ({ gig, onPress }) => {
  const businessName = gig.business?.name ?? "WorkNest business";

  return (
    <TouchableOpacity onPress={() => onPress(gig)} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{businessName.slice(0, 1)}</Text>
          </View>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{gig.title}</Text>
              <TrustBadge label="Verified" variant="success" />
            </View>
            <Text style={styles.shop}>{businessName}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.row}>
            <Feather name="map-pin" size={13} color={colors.textMuted} />
            <Text style={styles.meta}>{gig.location}</Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.category}>{gig.category?.name ?? "Uncategorized"}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Feather name="calendar" size={13} color={colors.textMuted} />
          <Text style={styles.meta}>{formatRelativeDate(gig.startDate)}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.wageWrap}>
            <Text style={styles.wage}>{formatCurrency(gig.paymentAmount)}</Text>
            <Text style={styles.wageType}>/{paymentTypeLabel(gig.paymentType)}</Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View Details</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.warmPanel,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.sizes.md,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  category: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "capitalize",
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  shop: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  categoryPill: {
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  wageWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  wage: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  wageType: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginLeft: 2,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ctaText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: "800",
  },
});
