import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as reputationApi from "../../api/reputationApi";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate } from "../../utils/formatters";
import type { ReputationSummary, Review } from "../../types";

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export const ReputationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName } = (route.params as { userId: string; userName?: string }) || {};

  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [rep, revs] = await Promise.all([
        reputationApi.getUserReputation(userId),
        reputationApi.getUserReviews(userId),
      ]);
      setReputation(rep);
      setReviews(revs);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const maxCount = reputation
    ? Math.max(1, ...Object.values(reputation.distribution))
    : 1;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{userName ? `${userName}'s Reputation` : "Reputation"}</Text>
        </View>

        {isLoading && !reputation ? (
          <LoadingSpinner message="Loading reputation..." />
        ) : (
          <>
            <Card style={styles.summaryCard}>
              <Text style={styles.averageValue}>
                {reputation?.averageRating !== null && reputation?.averageRating !== undefined
                  ? reputation.averageRating.toFixed(1)
                  : "—"}
              </Text>
              <Text style={styles.averageStars}>
                {stars(Math.round(reputation?.averageRating ?? 0))}
              </Text>
              <Text style={styles.totalReviews}>
                {reputation?.totalReviews ?? 0} review{reputation?.totalReviews === 1 ? "" : "s"}
              </Text>

              <View style={styles.distribution}>
                {(["5", "4", "3", "2", "1"] as const).map((key) => {
                  const count = reputation?.distribution[key] ?? 0;
                  const widthPct = (count / maxCount) * 100;
                  return (
                    <View key={key} style={styles.distributionRow}>
                      <Text style={styles.distributionLabel}>{key}★</Text>
                      <View style={styles.distributionTrack}>
                        <View style={[styles.distributionFill, { width: `${widthPct}%` }]} />
                      </View>
                      <Text style={styles.distributionCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Reviews</Text>
            {reviews.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No reviews yet.</Text>
              </Card>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.reviewer?.name ?? "Someone"}</Text>
                    <Text style={styles.reviewStars}>{stars(review.rating)}</Text>
                  </View>
                  {review.gig?.title ? <Text style={styles.reviewGig}>{review.gig.title}</Text> : null}
                  {review.comment ? <Text style={styles.reviewComment}>"{review.comment}"</Text> : null}
                  <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                </Card>
              ))
            )}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  summaryCard: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  averageValue: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  averageStars: {
    fontSize: typography.sizes.base,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  totalReviews: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  distribution: {
    width: "100%",
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  distributionLabel: {
    width: 28,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  distributionTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cream,
    marginHorizontal: spacing.sm,
    overflow: "hidden",
  },
  distributionFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  distributionCount: {
    width: 20,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  reviewCard: {
    marginBottom: spacing.md,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  reviewerName: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  reviewStars: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
  },
  reviewGig: {
    fontSize: typography.sizes.xs,
    color: colors.primaryDark,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  reviewComment: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontStyle: "italic",
    marginBottom: spacing.xs,
  },
  reviewDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
});
