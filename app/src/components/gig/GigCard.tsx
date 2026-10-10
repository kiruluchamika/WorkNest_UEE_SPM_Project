import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import type { GigPost } from "../../types";

function postedAt(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return formatDate(value);
}

export const GigCard: React.FC<{ gig: GigPost; onPress: (gig: GigPost) => void }> = ({ gig, onPress }) => {
  const summary = gig.employerSummary;
  const unit = gig.paymentType === "HOURLY" ? "hr" : gig.paymentType === "DAILY" ? "day" : "fixed";
  const remaining = Math.max((gig.workersNeeded ?? 1) - (gig.filledPositions ?? 0), 0);
  const isFull = remaining === 0;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${gig.title}, by ${gig.business?.name || "Business"}, ${formatCurrency(gig.paymentAmount)} per ${unit}. Tap to view details.`}
      onPress={() => onPress(gig)}
      activeOpacity={0.85}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{gig.category?.name || "General"}</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.timeAgo}>{postedAt(gig.createdAt)}</Text>
          {summary?.isVerified ? (
            <View style={styles.verifiedBadge}>
              <Feather name="check-circle" color={colors.success} size={13} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {gig.title}
      </Text>
      <Text style={styles.business} numberOfLines={1}>
        {gig.business?.name || "WorkNest Business"}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.locationWrap}>
          <Feather name="map-pin" color={colors.textMuted} size={13} />
          <Text style={styles.location} numberOfLines={1}>
            {gig.location}
          </Text>
        </View>
        <View style={styles.ratingWrap}>
          <Feather name="star" color={colors.warning} size={13} />
          <Text style={styles.rating}>
            {summary?.averageRating != null ? summary.averageRating.toFixed(1) : "New"}
            {summary?.totalReviews ? ` (${summary.totalReviews})` : ""}
          </Text>
        </View>
      </View>

      {gig.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {gig.description}
        </Text>
      ) : null}

      <View style={styles.tags}>
        <View style={styles.tag}>
          <Feather name="calendar" size={12} color={colors.primaryDark} />
          <Text style={styles.tagText} numberOfLines={1}>
            {formatDate(gig.startDate)}
            {gig.endDate ? ` - ${formatDate(gig.endDate)}` : ""}
          </Text>
        </View>
        {gig.startTime ? (
          <View style={styles.tag}>
            <Feather name="clock" size={12} color={colors.primaryDark} />
            <Text style={styles.tagText} numberOfLines={1}>
              {gig.startTime}
              {gig.endTime ? ` - ${gig.endTime}` : ""}
            </Text>
          </View>
        ) : null}
        <View style={[styles.tag, isFull && styles.tagFull]}>
          <Feather
            name="users"
            size={12}
            color={isFull ? colors.warningText : colors.primaryDark}
          />
          <Text style={[styles.tagText, isFull && styles.tagTextFull]}>
            {isFull ? "Filled" : `${remaining} spot${remaining === 1 ? "" : "s"} left`}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.payWrap}>
          <Text style={styles.payAmount}>{formatCurrency(gig.paymentAmount)}</Text>
          <Text style={styles.payUnit}>/{unit}</Text>
        </View>
        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>View Details</Text>
          <Feather name="arrow-right" size={14} color={colors.textInverse} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs + 2,
  },
  categoryBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  categoryText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  timeAgo: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  verifiedText: {
    color: colors.successText,
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: "800",
    marginBottom: 2,
    lineHeight: 22,
  },
  business: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs + 2,
    gap: spacing.sm,
  },
  locationWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  location: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  rating: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  tagFull: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xxs,
    fontWeight: "600",
  },
  tagTextFull: {
    color: colors.warningText,
    fontWeight: "700",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  payAmount: {
    color: colors.primaryDark,
    fontSize: typography.sizes.md,
    fontWeight: "800",
  },
  payUnit: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    marginLeft: 2,
  },
  ctaButton: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  ctaText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
});
