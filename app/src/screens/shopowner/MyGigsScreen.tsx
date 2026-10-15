import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useGigPosts } from "../../context/GigPostContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { StatusBadge } from "../../components/common/StatusBadge";
import { AppHeader } from "../../components/common/AppHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { FilterChips, FilterOption } from "../../components/common/FilterChips";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import type { GigPost, GigPostStatus } from "../../types";

type FilterTab = "ALL" | GigPostStatus;

const TABS: { value: FilterTab; label: string; icon?: keyof typeof Feather.glyphMap }[] = [
  { value: "ALL", label: "All", icon: "grid" },
  { value: "ACTIVE", label: "Active", icon: "check-circle" },
  { value: "PENDING", label: "In Review", icon: "clock" },
  { value: "COMPLETED", label: "Completed", icon: "award" },
  { value: "CLOSED", label: "Closed", icon: "lock" },
  { value: "REJECTED", label: "Rejected", icon: "x-circle" },
];

const EMPTY_COPY: Record<FilterTab, { title: string; description: string; icon: keyof typeof Feather.glyphMap }> = {
  ALL: {
    title: "No gigs posted yet",
    description: "Post a gig to start finding workers for your business needs.",
    icon: "briefcase",
  },
  ACTIVE: {
    title: "No active gigs",
    description: "Gigs approved by admin and open for applications will appear here.",
    icon: "check-circle",
  },
  PENDING: {
    title: "No gigs in review",
    description: "Gigs waiting for admin review and approval will appear here.",
    icon: "clock",
  },
  COMPLETED: {
    title: "No completed gigs",
    description: "Gigs you have successfully fulfilled and marked complete.",
    icon: "award",
  },
  CLOSED: {
    title: "No closed gigs",
    description: "Gigs that have been closed to new applicants.",
    icon: "lock",
  },
  REJECTED: {
    title: "No rejected gigs",
    description: "Gigs that need changes before approval will appear here.",
    icon: "x-circle",
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

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: gigPosts.length };
    gigPosts.forEach((g) => {
      map[g.status] = (map[g.status] ?? 0) + 1;
    });
    return map;
  }, [gigPosts]);

  const filterOptions: FilterOption<FilterTab>[] = useMemo(() => {
    return TABS.map((t) => ({
      value: t.value,
      label: t.label,
      count: counts[t.value] ?? 0,
      icon: t.icon,
    }));
  }, [counts]);

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
      <AppHeader
        subtitle="Manage Gigs"
        onProfilePress={() =>
          (navigation as any).getParent()?.navigate("Dashboard", { screen: "Profile" })
        }
        onBellPress={() => (navigation as any).getParent()?.navigate("Notifications")}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryDark}
          />
        }
      >
        {/* Header Action Row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Gigs</Text>
            <Text style={styles.headerSubtitle}>Track and manage all your posted opportunities</Text>
          </View>
        </View>

        <Button
          title="+ Create New Gig"
          icon="plus-circle"
          onPress={goToCreateGig}
          style={{ marginBottom: spacing.md }}
        />

        {/* Filter Chips Bar */}
        <FilterChips<FilterTab>
          options={filterOptions}
          selected={tab}
          onSelect={setTab}
          style={styles.tabsRow}
        />

        {isLoading && gigPosts.length === 0 ? (
          <LoadingSpinner message="Loading your gigs..." />
        ) : filteredGigs.length === 0 ? (
          <EmptyState
            icon={emptyCopy.icon}
            title={emptyCopy.title}
            description={emptyCopy.description}
            actionTitle={tab === "ALL" ? "Create Your First Gig" : "View All Gigs"}
            onAction={tab === "ALL" ? goToCreateGig : () => setTab("ALL")}
          />
        ) : (
          filteredGigs.map((gig: GigPost) => {
            const remaining = Math.max(gig.workersNeeded - (gig.filledPositions ?? 0), 0);
            return (
              <TouchableOpacity
                key={gig.id}
                activeOpacity={0.85}
                onPress={() => (navigation as any).navigate("GigDetail", { gigId: gig.id })}
              >
                <Card style={styles.gigCard} noPadding>
                  <View style={styles.gigRow}>
                    {gig.imageUrl ? (
                      <Image source={{ uri: gig.imageUrl }} style={styles.gigThumb} resizeMode="cover" />
                    ) : (
                      <View style={styles.gigThumbPlaceholder}>
                        <Feather name="briefcase" size={20} color={colors.primaryDark} />
                      </View>
                    )}
                    <View style={styles.gigContent}>
                      <View style={styles.gigHeader}>
                        <Text style={styles.gigTitle} numberOfLines={1}>
                          {gig.title}
                        </Text>
                        <StatusBadge status={gig.status} size="sm" />
                      </View>

                      <Text style={styles.gigMeta} numberOfLines={1}>
                        {gig.category?.name ?? "General"} • {gig.location}
                      </Text>

                      <View style={styles.gigFooter}>
                        <Text style={styles.gigPayment}>
                          {formatCurrency(gig.paymentAmount)} / {paymentTypeLabel(gig.paymentType)}
                        </Text>
                        <View style={styles.capacityBadge}>
                          <Feather
                            name="users"
                            size={11}
                            color={remaining === 0 ? colors.warningText : colors.primaryDark}
                          />
                          <Text
                            style={[
                              styles.capacityText,
                              remaining === 0 && styles.capacityTextFull,
                            ]}
                          >
                            {remaining === 0 ? "Full" : `${remaining} left`}
                          </Text>
                        </View>
                      </View>
                    </View>
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
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabsRow: {
    marginBottom: spacing.md,
  },
  gigCard: {
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.subtle,
  },
  gigRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  gigThumb: {
    width: 88,
    minHeight: 96,
    backgroundColor: colors.cream,
  },
  gigThumbPlaceholder: {
    width: 88,
    minHeight: 96,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  gigContent: {
    flex: 1,
    padding: spacing.md,
  },
  gigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: spacing.xs,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  gigMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  gigFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gigPayment: {
    fontSize: typography.sizes.xs,
    color: colors.successText,
    fontWeight: "700",
  },
  capacityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  capacityText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  capacityTextFull: {
    color: colors.warningText,
  },
});
