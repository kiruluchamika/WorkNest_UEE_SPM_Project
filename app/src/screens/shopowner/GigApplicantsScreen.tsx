import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useGigPosts } from "../../context/GigPostContext";
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
import { formatDate } from "../../utils/formatters";
import type { GigApplicantListItem, JobApplicationStatus } from "../../types";

type FilterTab = "ALL" | JobApplicationStatus;
type SortKey = "newest" | "name" | "status";

const TABS: { value: FilterTab; label: string; icon?: keyof typeof Feather.glyphMap }[] = [
  { value: "ALL", label: "All", icon: "grid" },
  { value: "PENDING", label: "Pending", icon: "clock" },
  { value: "SHORTLISTED", label: "Shortlisted", icon: "star" },
  { value: "HIRED", label: "Hired", icon: "check-circle" },
  { value: "COMPLETED", label: "Completed", icon: "award" },
  { value: "REJECTED", label: "Rejected", icon: "x-circle" },
  { value: "WITHDRAWN", label: "Withdrawn", icon: "slash" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
];

function compareApplicants(a: GigApplicantListItem, b: GigApplicantListItem, sort: SortKey): number {
  if (sort === "name") {
    return a.applicant.name.localeCompare(b.applicant.name);
  }
  if (sort === "status") {
    return a.status.localeCompare(b.status);
  }
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export const GigApplicantsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gigId } = (route.params as { gigId: string }) || {};
  const { gigPosts } = useGigPosts();
  const gig = gigPosts.find((g) => g.id === gigId);

  const [applicants, setApplicants] = useState<GigApplicantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const load = useCallback(async () => {
    if (!gigId) {
      setLoadError("This gig could not be identified.");
      setLoading(false);
      return;
    }
    try {
      const data = await applicationsApi.getGigApplicants(gigId);
      setApplicants(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load applicants.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gigId]);

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
    const result: Record<string, number> = { ALL: applicants.length };
    applicants.forEach((a) => {
      result[a.status] = (result[a.status] ?? 0) + 1;
    });
    return result;
  }, [applicants]);

  const filterOptions: FilterOption<FilterTab>[] = useMemo(() => {
    return TABS.map((t) => ({
      value: t.value,
      label: t.label,
      count: counts[t.value] ?? 0,
      icon: t.icon,
    }));
  }, [counts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applicants
      .filter((a) => tab === "ALL" || a.status === tab)
      .filter((a) => !query || a.applicant.name.toLowerCase().includes(query))
      .sort((a, b) => compareApplicants(a, b, sort));
  }, [applicants, tab, search, sort]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading applicants..." fullScreen />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <ErrorState
          title="Couldn't load applicants"
          message={loadError}
          onRetry={load}
          onGoBack={() => navigation.goBack()}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
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
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Applicants</Text>
          <View style={{ width: 36 }} />
        </View>

        {gig ? (
          <View style={styles.gigHeader}>
            <Text style={styles.gigTitle}>{gig.title}</Text>
            <Text style={styles.gigSub}>{applicants.length} total applicant(s)</Text>
          </View>
        ) : null}

        {/* Filter Chips Bar */}
        <FilterChips<FilterTab>
          options={filterOptions}
          selected={tab}
          onSelect={setTab}
          style={styles.tabsRow}
        />

        {/* Search & Sort Controls */}
        <View style={styles.controlsRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={15} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by applicant name..."
              placeholderTextColor={colors.textPlaceholder}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Sort Chips */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {SORT_OPTIONS.map((s) => {
            const isSelected = sort === s.value;
            return (
              <TouchableOpacity
                key={s.value}
                onPress={() => setSort(s.value)}
                style={[styles.sortChip, isSelected && styles.sortChipActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.sortChipText, isSelected && styles.sortChipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Applicants List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon="users"
            title={
              search.trim()
                ? `No applicants match "${search.trim()}"`
                : tab === "ALL"
                ? "No applicants yet"
                : `No ${tab.toLowerCase()} applicants`
            }
            description={
              search.trim()
                ? "Try searching with a different name or clear the search query."
                : "Applicants who submit for this gig will appear here for your review."
            }
            actionTitle={search.trim() ? "Clear Search" : undefined}
            onAction={search.trim() ? () => setSearch("") : undefined}
          />
        ) : (
          filtered.map((app) => (
            <TouchableOpacity
              key={app.id}
              activeOpacity={0.85}
              onPress={() => (navigation as any).navigate("ApplicantDetails", { applicationId: app.id })}
            >
              <Card style={styles.appCard}>
                <View style={styles.appHeader}>
                  <View style={styles.applicantAvatar}>
                    <Text style={styles.avatarInitials}>
                      {app.applicant.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.applicantMeta}>
                    <Text style={styles.appName}>{app.applicant.name}</Text>
                    <Text style={styles.appliedDate}>Applied {formatDate(app.createdAt)}</Text>
                  </View>
                  <StatusBadge status={app.status} size="sm" />
                </View>

                <View style={styles.appFooter}>
                  <Text style={styles.viewLinkText}>Review Application</Text>
                  <Feather name="chevron-right" size={14} color={colors.primaryDark} />
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
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },
  navTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  gigHeader: {
    marginBottom: spacing.sm,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  gigSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabsRow: {
    marginBottom: spacing.sm,
  },
  controlsRow: {
    marginBottom: spacing.xs + 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    ...shadows.subtle,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    marginLeft: spacing.xs + 2,
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  sortLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textMuted,
  },
  sortChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  sortChipText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.textInverse,
  },
  appCard: {
    marginBottom: spacing.sm + 2,
    ...shadows.subtle,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  applicantAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xs,
    fontWeight: "800",
  },
  applicantMeta: {
    flex: 1,
  },
  appName: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.text,
  },
  appliedDate: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    marginTop: 1,
  },
  appFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  viewLinkText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
  },
});
