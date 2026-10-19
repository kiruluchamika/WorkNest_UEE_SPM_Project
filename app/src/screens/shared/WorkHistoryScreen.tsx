import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as reputationApi from "../../api/reputationApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate, gigStatusBadge } from "../../utils/formatters";
import type { WorkHistoryEntry } from "../../types";

export const WorkHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = (route.params as { userId: string }) || {};

  const [entries, setEntries] = useState<WorkHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const data = await reputationApi.getUserWorkHistory(userId);
      setEntries(data);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Work History</Text>
        </View>

        {isLoading && entries.length === 0 ? (
          <LoadingSpinner message="Loading work history..." />
        ) : entries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="clock" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.emptyTitle}>No work history yet</Text>
            <Text style={styles.emptyText}>Completed gigs will appear here.</Text>
          </Card>
        ) : (
          entries.map((entry) => {
            const badge = gigStatusBadge(entry.gigStatus);
            return (
              <Card key={entry.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.gigTitle} numberOfLines={1}>
                    {entry.gigTitle}
                  </Text>
                  <TrustBadge label={badge.label} variant={badge.variant} />
                </View>
                <Text style={styles.roleText}>
                  {entry.role === "YOUTH" ? "Worked for" : "Hired"} {entry.counterpartName}
                </Text>
                <Text style={styles.date}>Completed {formatDate(entry.completedAt)}</Text>

                {entry.hasReviewed === false ? (
                  <Button
                    title="Leave a Review"
                    size="sm"
                    onPress={() =>
                      (navigation as any).navigate("ReviewForm", {
                        gigId: entry.gigId,
                        revieweeId: entry.counterpartId,
                        revieweeName: entry.counterpartName,
                      })
                    }
                    style={{ marginTop: spacing.sm }}
                  />
                ) : entry.hasReviewed === true ? (
                  <View style={styles.reviewedTag}>
                    <Feather name="check" size={12} color={colors.success} />
                    <Text style={styles.reviewedText}>Review submitted</Text>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
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
  cardHeader: {
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
  roleText: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark,
    fontWeight: "700",
    marginBottom: 2,
  },
  date: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  reviewedTag: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  reviewedText: {
    fontSize: typography.sizes.xs,
    color: colors.success,
    fontWeight: "700",
    marginLeft: spacing.xs,
  },
});
