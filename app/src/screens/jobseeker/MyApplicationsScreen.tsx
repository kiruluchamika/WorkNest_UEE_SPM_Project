import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as applicationsApi from "../../api/applicationsApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { FilterChips, FilterOption } from "../../components/common/FilterChips";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate, formatCurrency } from "../../utils/formatters";
import type { JobApplicationStatus, MyApplicationListItem } from "../../types";

type FilterTab = "ALL" | JobApplicationStatus;

const TABS: { value: FilterTab; label: string; icon?: keyof typeof Feather.glyphMap }[] = [
  { value: "ALL", label: "All", icon: "grid" },
  { value: "PENDING", label: "Pending", icon: "clock" },
  { value: "SHORTLISTED", label: "Shortlisted", icon: "star" },
  { value: "HIRED", label: "Hired", icon: "check-circle" },
  { value: "COMPLETED", label: "Completed", icon: "award" },
  { value: "REJECTED", label: "Rejected", icon: "x-circle" },
  { value: "WITHDRAWN", label: "Withdrawn", icon: "slash" },
];

const EMPTY_DESCRIPTIONS: Record<FilterTab, { title: string; description: string; icon: keyof typeof Feather.glyphMap }> = {
  ALL: {
    title: "No applications yet",
    description: "Browse available gigs and submit applications to see them tracked here.",
    icon: "file-text",
  },
  PENDING: {
    title: "No pending applications",
    description: "You don't have any applications awaiting review.",
    icon: "clock",
  },
  SHORTLISTED: {
    title: "No shortlisted applications yet",
    description: "When an employer shortlists your profile, it will appear in this tab.",
    icon: "star",
  },
  HIRED: {
    title: "No hired applications yet",
    description: "Congratulations! Applications you've been hired for will be listed here.",
    icon: "check-circle",
  },
  COMPLETED: {
    title: "No completed gigs yet",
    description: "Finished gigs you have worked on will show up here.",
    icon: "award",
  },
  REJECTED: {
    title: "No rejected applications",
    description: "You don't have any rejected applications.",
    icon: "slash",
  },
  WITHDRAWN: {
    title: "No withdrawn applications",
    description: "Applications you voluntarily withdraw will be archived here.",
    icon: "slash",
  },
};

export const MyApplicationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [applications, setApplications] = useState<MyApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>("ALL");

  const load = useCallback(async () => {
    try {
      const data = await applicationsApi.getMyApplications();
      setApplications(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load your applications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
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
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: applications.length };
    applications.forEach((a) => {
      map[a.status] = (map[a.status] ?? 0) + 1;
    });
    return map;
  }, [applications]);

  const filterOptions: FilterOption<FilterTab>[] = useMemo(() => {
    return TABS.map((t) => ({
      value: t.value,
      label: t.label,
      count: counts[t.value] ?? 0,
      icon: t.icon,
    }));
  }, [counts]);

  const filtered = useMemo(
    () => (tab === "ALL" ? applications : applications.filter((a) => a.status === tab)),
    [applications, tab]
  );

  const emptyConfig = EMPTY_DESCRIPTIONS[tab];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryDark}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>My Applications</Text>
          <Text style={styles.subtitle}>
            Track review status, hiring decisions, and completed work.
          </Text>
        </View>

        {/* Filter Chips Bar */}
        <FilterChips<FilterTab>
          options={filterOptions}
          selected={tab}
          onSelect={setTab}
          style={styles.tabsRow}
        />

        {loading ? (
          <LoadingSpinner message="Loading your applications..." />
        ) : loadError ? (
          <ErrorState
            title="Couldn't load applications"
            message={loadError}
            onRetry={load}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={emptyConfig.icon}
            title={emptyConfig.title}
            description={emptyConfig.description}
            actionTitle={tab !== "ALL" ? "View All Applications" : undefined}
            onAction={tab !== "ALL" ? () => setTab("ALL") : undefined}
          />
        ) : (
          filtered.map((app) => (
            <TouchableOpacity
              key={app.id}
              activeOpacity={0.85}
              onPress={() =>
                (navigation as any).navigate("ApplicationDetails", { applicationId: app.id })
              }
            >
              <Card style={styles.appCard}>
                <View style={styles.appHeader}>
                  <Text style={styles.appTitle} numberOfLines={1}>
                    {app.gig.title}
                  </Text>
                  <StatusBadge status={app.status} size="sm" />
                </View>

                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={13} color={colors.textMuted} />
                  <Text style={styles.appMeta} numberOfLines={1}>
                    {app.gig.location}
                  </Text>
                </View>

                <View style={styles.appFooter}>
                  <View style={styles.dateWrap}>
                    <Feather name="calendar" size={12} color={colors.textMuted} />
                    <Text style={styles.dateText}>Applied {formatDate(app.createdAt)}</Text>
                  </View>

                  <View style={styles.actionLink}>
                    <Text style={styles.actionText}>Details</Text>
                    <Feather name="chevron-right" size={14} color={colors.primaryDark} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
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
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabsRow: {
    marginBottom: spacing.md,
  },
  appCard: {
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs + 2,
    gap: spacing.sm,
  },
  appTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.sm,
  },
  appMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    flex: 1,
  },
  appFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  dateWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    fontWeight: "500",
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
  },
});
