import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getUserReviewsPage } from "../../api/reputationApi";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate } from "../../utils/formatters";
import type { Review, GigPost } from "../../types";

export function EmployerSection({
  gig,
  full = false,
  onViewProfile,
}: {
  gig: GigPost;
  full?: boolean;
  onViewProfile?: () => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      getUserReviewsPage(gig.businessId, page, full ? 20 : 3)
        .then((data) => {
          if (active) {
            setReviews((previous) =>
              page === 1
                ? data.reviews
                : [...previous, ...data.reviews.filter((r) => !previous.some((p) => p.id === r.id))]
            );
            setTotal(data.total);
          }
        })
        .catch((e) => {
          if (active) setError(e instanceof Error ? e.message : "Could not load reviews.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [gig.businessId, page, full, retry])
  );

  const summary = gig.employerSummary;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>
        {full ? gig.business?.name || "Employer Profile" : "About the Employer"}
      </Text>

      {!full && (
        <View style={styles.businessRow}>
          <Text style={styles.businessName}>{gig.business?.name || "WorkNest Business"}</Text>
          {summary?.isVerified ? (
            <View style={styles.verifiedBadge}>
              <Feather name="check-circle" size={12} color={colors.successText} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>
      )}

      {!!gig.business?.bio && <Text style={styles.body}>{gig.business.bio}</Text>}

      {!!gig.business?.location && (
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={13} color={colors.textMuted} />
          <Text style={styles.locationText}>{gig.business.location}</Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <View style={styles.statTop}>
            <Feather name="star" size={15} color={colors.warning} />
            <Text style={styles.statValue}>
              {summary?.averageRating != null ? summary.averageRating.toFixed(1) : "New"}
            </Text>
          </View>
          <Text style={styles.statLabel}>
            {summary?.totalReviews ? `${summary.totalReviews} reviews` : "No ratings yet"}
          </Text>
        </View>

        <View style={styles.statBox}>
          <View style={styles.statTop}>
            <Feather name="check-square" size={15} color={colors.primaryDark} />
            <Text style={styles.statValue}>{summary?.completedGigs ?? 0}</Text>
          </View>
          <Text style={styles.statLabel}>Completed Gigs</Text>
        </View>
      </View>

      <View style={styles.reviewsHeader}>
        <Text style={styles.sectionSubhead}>
          {full ? "Worker Reviews" : "Recent Reviews"}
        </Text>
        {total > 0 ? (
          <Text style={styles.reviewCountBadge}>{total}</Text>
        ) : null}
      </View>

      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewerName}>{review.reviewer?.name || "Worker"}</Text>
            <View style={styles.ratingBadge}>
              <Feather name="star" size={11} color={colors.warning} />
              <Text style={styles.ratingText}>{review.rating}/5</Text>
            </View>
          </View>
          <Text style={styles.reviewDate}>
            {formatDate(review.createdAt)}
            {review.gig ? ` • ${review.gig.title}` : ""}
          </Text>
          {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
        </View>
      ))}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primaryDark} size="small" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setRetry((v) => v + 1)}
            style={styles.retryButton}
          >
            <Text style={styles.link}>Retry reviews</Text>
          </TouchableOpacity>
        </View>
      ) : !loading && !reviews.length ? (
        <Text style={styles.noReviews}>No worker reviews yet.</Text>
      ) : null}

      {full && !loading && !error && reviews.length < total ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setPage((p) => p + 1)}
          style={styles.loadMoreButton}
        >
          <Text style={styles.link}>Load more reviews</Text>
        </TouchableOpacity>
      ) : null}

      {!full && onViewProfile ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onViewProfile}
          style={styles.viewProfileRow}
        >
          <Text style={styles.viewProfileText}>View full employer profile & all reviews</Text>
          <Feather name="chevron-right" size={16} color={colors.primaryDark} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: "800",
  },
  businessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  businessName: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: "700",
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
  body: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  statValue: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.sizes.base,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.xxs,
    fontWeight: "600",
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  sectionSubhead: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  reviewCountBadge: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  reviewCard: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    gap: 3,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewerName: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
  },
  reviewDate: {
    color: colors.textMuted,
    fontSize: typography.sizes.xxs,
  },
  reviewComment: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  errorBox: {
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
  },
  retryButton: {
    marginTop: 4,
  },
  noReviews: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontStyle: "italic",
    paddingVertical: spacing.xs,
  },
  loadMoreButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  viewProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  viewProfileText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  link: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: typography.sizes.xs,
  },
});
