import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAdminGigs } from "../../context/AdminGigContext";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { AppHeader } from "../../components/common/AppHeader";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate, gigStatusBadge } from "../../utils/formatters";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import type { GigPostStatus } from "../../types";

type FilterTab = "PENDING" | "ACTIVE" | "REJECTED" | "ALL";

const TABS: { value: FilterTab; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const EMPTY_COPY: Record<FilterTab, { title: string; text: string }> = {
  PENDING: {
    title: "No pending gigs",
    text: "New gig submissions waiting for review will appear here.",
  },
  ACTIVE: {
    title: "No active gigs",
    text: "Approved gigs currently live for workers will appear here.",
  },
  REJECTED: {
    title: "No rejected gigs",
    text: "Gigs sent back for changes will appear here.",
  },
  ALL: {
    title: "No gigs yet",
    text: "Gigs submitted by businesses will appear here.",
  },
};

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

export const GigManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { gigs, isLoading, stats, refresh } = useAdminGigs();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<FilterTab>("PENDING");

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filteredGigs = useMemo(
    () => (tab === "ALL" ? gigs : gigs.filter((g) => g.status === (tab as GigPostStatus))),
    [gigs, tab]
  );

  const emptyCopy = EMPTY_COPY[tab];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader
        subtitle="Gig management"
        onBellPress={() => navigation.getParent()?.navigate("NotificationsTab" as never)}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Gig moderation</Text>
            <Text style={styles.title}>Keep the gig board trustworthy</Text>
          </View>
          <View style={styles.heroIcon}>
            <Feather name="shield" size={18} color={colors.primaryDark} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{stats.rejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setTab(t.value)}
              style={[styles.tab, tab === t.value && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
              {t.value === "PENDING" && stats.pending > 0 ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{stats.pending}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading && gigs.length === 0 ? (
          <LoadingSpinner message="Loading gigs..." />
        ) : filteredGigs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="inbox" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
            <Text style={styles.emptyText}>{emptyCopy.text}</Text>
          </Card>
        ) : (
          filteredGigs.map((gig) => {
            const badge = gigStatusBadge(gig.status);
            return (
              <TouchableOpacity
                key={gig.id}
                activeOpacity={0.85}
                onPress={() => (navigation as any).navigate("GigReview", { gigId: gig.id })}
              >
                <Card style={styles.gigCard}>
                  <View style={styles.gigHeader}>
                    <Text style={styles.gigTitle} numberOfLines={1}>
                      {gig.title}
                    </Text>
                    <TrustBadge label={badge.label} variant={badge.variant} />
                  </View>
                  <Text style={styles.gigBusiness}>{gig.business?.name ?? "Unknown business"}</Text>
                  <Text style={styles.gigMeta}>
                    {gig.category?.name ?? "Uncategorized"} • {gig.location}
                  </Text>
                  <View style={styles.gigFooter}>
                    <Text style={styles.gigPayment}>
                      {formatCurrency(gig.paymentAmount)} / {paymentTypeLabel(gig.paymentType)}
                    </Text>
                    <Text style={styles.gigDate}>Submitted {formatDate(gig.createdAt)}</Text>
                  </View>
                  <View style={styles.viewDetails}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <Feather name="chevron-right" size={14} color={colors.primaryDark} />
                  </View>
                </Card>
              </TouchableOpacity>
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
  hero: {
    backgroundColor: colors.warmPanel,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  eyebrow: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    maxWidth: 220,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabsRow: {
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
  },
  tabTextActive: {
    color: colors.textInverse,
    fontWeight: "800",
  },
  tabBadge: {
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textInverse,
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
  gigCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  gigHeader: {
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
  gigBusiness: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark,
    fontWeight: "700",
    marginBottom: 2,
  },
  gigMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  gigFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gigPayment: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    fontWeight: "700",
  },
  gigDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  viewDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewDetailsText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
    marginRight: 2,
  },
});
