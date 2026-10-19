import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import type { GigPost } from "../../types";

const IMAGE_HEIGHT = 150;

function postedAt(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return formatDate(value);
}

export const GigCard: React.FC<{ gig: GigPost; onPress: (gig: GigPost) => void }> = ({ gig, onPress }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const summary = gig.employerSummary;
  const businessName = gig.business?.name || "WorkNest Business";
  const unit = gig.paymentType === "HOURLY" ? "hr" : gig.paymentType === "DAILY" ? "day" : "fixed";
  const remaining = Math.max((gig.workersNeeded ?? 1) - (gig.filledPositions ?? 0), 0);
  const isFull = remaining === 0;
  const isAlmostFull = !isFull && remaining <= 2;
  const showImage = !!gig.imageUrl && !imageFailed;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${gig.title}, by ${businessName}, ${formatCurrency(gig.paymentAmount)} per ${unit}. Tap to view details.`}
      onPress={() => onPress(gig)}
      activeOpacity={0.9}
      style={styles.card}
    >
      {/* Media: gig photo, or a branded placeholder so every card keeps the same rhythm */}
      <View style={styles.media}>
        {showImage ? (
          <Image
            source={{ uri: gig.imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <LinearGradient
            colors={[colors.primarySoft, colors.surfaceSubtle]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.placeholder]}
          >
            <View style={styles.placeholderIcon}>
              <Feather name="briefcase" size={26} color={colors.primaryDark} />
            </View>
          </LinearGradient>
        )}

        {/* Darken the edges so the overlaid chips stay readable on any photo */}
        {showImage ? (
          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)", "rgba(0,0,0,0.25)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}

        <View style={styles.mediaTopRow}>
          <View style={styles.overlayChip}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {gig.category?.name || "General"}
            </Text>
          </View>
          <View style={styles.overlayChip}>
            <Feather name="clock" size={11} color={colors.textSecondary} />
            <Text style={styles.overlayChipText}>{postedAt(gig.createdAt)}</Text>
          </View>
        </View>

        {isFull || isAlmostFull ? (
          <View style={[styles.spotsBanner, isFull ? styles.spotsBannerFull : styles.spotsBannerUrgent]}>
            <Feather name={isFull ? "slash" : "zap"} size={11} color={colors.textInverse} />
            <Text style={styles.spotsBannerText}>
              {isFull ? "Positions filled" : `Only ${remaining} spot${remaining === 1 ? "" : "s"} left`}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {gig.title}
        </Text>

        {/* Employer row: who you'd be working for, and how trusted they are */}
        <View style={styles.employerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{businessName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.business} numberOfLines={1}>
            {businessName}
          </Text>
          {summary?.isVerified ? (
            <Feather name="check-circle" color={colors.success} size={13} accessibilityLabel="Verified employer" />
          ) : null}
          <View style={styles.ratingWrap}>
            <Feather name="star" color={colors.warning} size={12} />
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

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Feather name="map-pin" size={13} color={colors.primary} />
            <Text style={styles.detailText} numberOfLines={1}>
              {gig.location}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Feather name="calendar" size={13} color={colors.primary} />
            <Text style={styles.detailText} numberOfLines={1}>
              {formatDate(gig.startDate)}
              {gig.endDate ? ` – ${formatDate(gig.endDate)}` : ""}
            </Text>
          </View>
          {gig.startTime ? (
            <View style={styles.detailItem}>
              <Feather name="clock" size={13} color={colors.primary} />
              <Text style={styles.detailText} numberOfLines={1}>
                {gig.startTime}
                {gig.endTime ? ` – ${gig.endTime}` : ""}
              </Text>
            </View>
          ) : null}
          {!isFull && !isAlmostFull ? (
            <View style={styles.detailItem}>
              <Feather name="users" size={13} color={colors.primary} />
              <Text style={styles.detailText}>{remaining} spots open</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.payLabel}>Pay</Text>
            <View style={styles.payWrap}>
              <Text style={styles.payAmount}>{formatCurrency(gig.paymentAmount)}</Text>
              <Text style={styles.payUnit}>/{unit}</Text>
            </View>
          </View>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>View Details</Text>
            <Feather name="arrow-right" size={14} color={colors.textInverse} />
          </View>
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
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.small,
  },
  media: {
    height: IMAGE_HEIGHT,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: "space-between",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  overlayChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  categoryText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  overlayChipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
  },
  spotsBanner: {
    position: "absolute",
    left: spacing.sm + 2,
    bottom: spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  spotsBannerUrgent: {
    backgroundColor: colors.warning,
  },
  spotsBannerFull: {
    backgroundColor: colors.textSecondary,
  },
  spotsBannerText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
  },
  body: {
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: "800",
    lineHeight: 24,
    marginBottom: spacing.xs + 2,
  },
  employerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
  },
  business: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    flexShrink: 1,
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: "auto",
    backgroundColor: colors.warningLight,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rating: {
    color: colors.warningText,
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginBottom: spacing.sm + 2,
  },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "50%",
    paddingRight: spacing.sm,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    flexShrink: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  payWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  payAmount: {
    color: colors.primaryDark,
    fontSize: typography.sizes.lg,
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
    paddingVertical: spacing.sm,
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
