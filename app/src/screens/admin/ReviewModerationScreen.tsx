import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as adminReviewApi from "../../api/adminReviewApi";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { AppHeader } from "../../components/common/AppHeader";
import { RejectionModal } from "../../components/common/RejectionModal";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate } from "../../utils/formatters";
import type { FlaggedReview, ModerationAction } from "../../types";

const MODAL_COPY: Record<ModerationAction, { title: string; subtitle: string; submitLabel: string }> = {
  REMOVE_REVIEW: {
    title: "Remove Review",
    subtitle: "This review will be removed and excluded from the reviewee's rating.",
    submitLabel: "Remove Review",
  },
  DISMISS_REPORT: {
    title: "Dismiss Report",
    subtitle: "The review will be restored and remain published.",
    submitLabel: "Dismiss Report",
  },
  WARN_AUTHOR: {
    title: "Warn Author",
    subtitle: "The review stays published, but the author will receive a warning.",
    submitLabel: "Warn Author",
  },
};

export const ReviewModerationScreen: React.FC = () => {
  const [reviews, setReviews] = useState<FlaggedReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionState, setActionState] = useState<{ reviewId: string; action: ModerationAction } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminReviewApi.listFlaggedReviews();
      setReviews(data);
    } catch (err) {
      Alert.alert("Something went wrong", err instanceof Error ? err.message : "Could not load flagged reviews.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleModerate = async (reason: string) => {
    if (!actionState) return;
    setSubmitting(true);
    try {
      await adminReviewApi.moderateReview(actionState.reviewId, actionState.action, reason);
      setActionState(null);
      await load();
    } catch (err) {
      Alert.alert("Something went wrong", err instanceof Error ? err.message : "Could not moderate this review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader subtitle="Review moderation" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading && reviews.length === 0 ? (
          <LoadingSpinner message="Loading flagged reviews..." />
        ) : reviews.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="flag" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.emptyTitle}>No flagged reviews</Text>
            <Text style={styles.emptyText}>Reported reviews will show up here for moderation.</Text>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.gigTitle} numberOfLines={1}>
                  {review.gig?.title ?? "Gig"}
                </Text>
                <Text style={styles.stars}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </Text>
              </View>
              <Text style={styles.parties}>
                {review.reviewer?.name ?? "Unknown"} → {review.reviewee?.name ?? "Unknown"}
              </Text>
              {review.comment ? <Text style={styles.comment}>"{review.comment}"</Text> : null}
              <Text style={styles.date}>Posted {formatDate(review.createdAt)}</Text>

              <View style={styles.reportsBox}>
                <Text style={styles.reportsTitle}>Reports</Text>
                {review.reports.map((report) => (
                  <View key={report.id} style={styles.reportRow}>
                    <Text style={styles.reportReporter}>{report.reporter?.name ?? "A user"}:</Text>
                    <Text style={styles.reportReason}>{report.reason}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.dismissButton]}
                  onPress={() => setActionState({ reviewId: review.id, action: "DISMISS_REPORT" })}
                >
                  <Text style={styles.dismissText}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.warnButton]}
                  onPress={() => setActionState({ reviewId: review.id, action: "WARN_AUTHOR" })}
                >
                  <Text style={styles.warnText}>Warn Author</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={() => setActionState({ reviewId: review.id, action: "REMOVE_REVIEW" })}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <RejectionModal
        visible={!!actionState}
        onCancel={() => setActionState(null)}
        onSubmit={handleModerate}
        submitting={submitting}
        title={actionState ? MODAL_COPY[actionState.action].title : ""}
        subtitle={actionState ? MODAL_COPY[actionState.action].subtitle : ""}
        submitLabel={actionState ? MODAL_COPY[actionState.action].submitLabel : ""}
        placeholder="Moderation reason..."
      />
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
  emptyCard: {
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  stars: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
  },
  parties: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  comment: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontStyle: "italic",
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  reportsBox: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  reportsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  reportRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  reportReporter: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.text,
    marginRight: spacing.xs,
  },
  reportReason: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
  },
  actionButton: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginRight: spacing.xs,
  },
  dismissButton: {
    backgroundColor: colors.cream,
  },
  dismissText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: typography.sizes.xs,
  },
  warnButton: {
    backgroundColor: "#FFF8E1",
  },
  warnText: {
    color: colors.warning,
    fontWeight: "700",
    fontSize: typography.sizes.xs,
  },
  removeButton: {
    backgroundColor: colors.dangerLight,
    marginRight: 0,
  },
  removeText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: typography.sizes.xs,
  },
});
