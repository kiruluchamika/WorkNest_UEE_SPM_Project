import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useGigPosts } from "../../context/GigPostContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { AppHeader } from "../../components/common/AppHeader";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate, gigStatusBadge } from "../../utils/formatters";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import type { GigPost, GigPostStatus } from "../../types";

type FilterTab = "ALL" | GigPostStatus;

const TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CLOSED", label: "Closed" },
];

const EMPTY_COPY: Record<FilterTab, { title: string; text: string }> = {
  ALL: {
    title: "No gigs yet",
    text: "Start creating opportunities for local workers.",
  },
  PENDING: {
    title: "No pending gigs",
    text: "Your gigs waiting for approval will appear here.",
  },
  ACTIVE: {
    title: "No active gigs",
    text: "Approved gigs that are live for workers will appear here.",
  },
  REJECTED: {
    title: "No rejected gigs",
    text: "Gigs that need changes after admin review will appear here.",
  },
  CLOSED: {
    title: "No closed gigs",
    text: "Gigs you've closed will appear here.",
  },
  COMPLETED: {
    title: "No completed gigs",
    text: "Finished gigs will appear here.",
  },
};

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

export const MyGigsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { gigPosts, isLoading, refresh } = useGigPosts();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<FilterTab>("ALL");

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
    () => (tab === "ALL" ? gigPosts : gigPosts.filter((g) => g.status === tab)),
    [gigPosts, tab]
  );

  const emptyCopy = EMPTY_COPY[tab];

  const goToCreateGig = () => {
    navigation.getParent()?.navigate("PostGig" as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader subtitle="My Gigs" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Gig management</Text>
            <Text style={styles.title}>Track every opportunity you've posted</Text>
          </View>
          <View style={styles.heroIcon}>
            <Feather name="briefcase" size={18} color={colors.primaryDark} />
          </View>
        </View>

        <Button title="+ Create Gig" onPress={goToCreateGig} style={{ marginBottom: spacing.md }} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setTab(t.value)}
              style={[styles.tab, tab === t.value && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading && gigPosts.length === 0 ? (
          <LoadingSpinner message="Loading your gigs..." />
        ) : filteredGigs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="briefcase" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
            <Text style={styles.emptyText}>{emptyCopy.text}</Text>
            {tab === "ALL" ? (
              <Button
                title="Create Your First Gig"
                onPress={goToCreateGig}
                size="sm"
                style={{ marginTop: spacing.md }}
              />
            ) : null}
          </Card>
        ) : (
          filteredGigs.map((gig: GigPost) => {
            const badge = gigStatusBadge(gig.status);
            return (
              <TouchableOpacity
                key={gig.id}
                activeOpacity={0.85}
                onPress={() => (navigation as any).navigate("GigDetail", { gigId: gig.id })}
              >
                <Card style={styles.gigCard}>
                  <View style={styles.gigHeader}>
                    <Text style={styles.gigTitle} numberOfLines={1}>
                      {gig.title}
                    </Text>
                    <TrustBadge label={badge.label} variant={badge.variant} />
                  </View>
                  <Text style={styles.gigMeta}>
                    {gig.category?.name ?? "Uncategorized"} • {gig.location}
                  </Text>
                  <View style={styles.gigFooter}>
                    <Text style={styles.gigPayment}>
                      {formatCurrency(gig.paymentAmount)} / {paymentTypeLabel(gig.paymentType)}
                    </Text>
                    <Text style={styles.gigDate}>{formatDate(gig.startDate)}</Text>
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
    backgroundColor: colors.background,
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
  tabsRow: {
    marginBottom: spacing.md,
  },
  tab: {
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
    marginBottom: spacing.sm,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
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
});
