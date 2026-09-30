import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useGigPosts } from "../../context/GigPostContext";
import * as applicationsApi from "../../api/applicationsApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ApplicationStatusBadge } from "../../components/applications/ApplicationStatusBadge";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate } from "../../utils/formatters";
import type { GigApplicantListItem, JobApplicationStatus } from "../../types";

type FilterTab = "ALL" | JobApplicationStatus;

const TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "COMPLETED", label: "Completed" },
];

type SortOption = "NEWEST" | "OLDEST" | "TRUST" | "PAY";

// NEWEST matches the server's default order (createdAt desc).
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "TRUST", label: "Trust score" },
  { value: "PAY", label: "Lowest pay" },
];

function compareApplicants(a: GigApplicantListItem, b: GigApplicantListItem, sort: SortOption): number {
  const byNewest = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  switch (sort) {
    case "OLDEST":
      return -byNewest;
    case "TRUST":
      return (b.applicant.trustScore ?? 0) - (a.applicant.trustScore ?? 0) || byNewest;
    case "PAY": {
      // Applicants who didn't state expected pay go last.
      const aPay = a.expectedSalary ?? Number.POSITIVE_INFINITY;
      const bPay = b.expectedSalary ?? Number.POSITIVE_INFINITY;
      if (aPay === bPay) return byNewest;
      return aPay < bPay ? -1 : 1;
    }
    default:
      return byNewest;
  }
}

export const GigApplicantsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gigId } = (route.params as { gigId: string }) || {};
  const { gigPosts, refresh } = useGigPosts();
  const gig = gigPosts.find((g) => g.id === gigId);

  const [applicants, setApplicants] = useState<GigApplicantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("NEWEST");

  const load = useCallback(async () => {
    if (!gigId) {
      setLoadError("This gig could not be identified.");
      setLoading(false);
      return;
    }
    try {
      const [data] = await Promise.all([applicationsApi.getGigApplicants(gigId), refresh()]);
      setApplicants(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load applicants.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gigId, refresh]);

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
        <View style={styles.centerState}>
          <Feather name="alert-triangle" size={22} color={colors.danger} />
          <Text style={styles.centerTitle}>Can&apos;t load applicants</Text>
          <Text style={styles.centerText}>{loadError}</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applicants</Text>
          <View style={{ width: 32 }} />
        </View>

        {gig ? <Text style={styles.gigTitle}>{gig.title}</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setTab(t.value)}
              style={[styles.tab, tab === t.value && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>
                {t.label} {counts[t.value] ?? 0}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by applicant name"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {SORT_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s.value}
              onPress={() => setSort(s.value)}
              style={[styles.sortChip, sort === s.value && styles.tabActive]}
            >
              <Text style={[styles.tabText, sort === s.value && styles.tabTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {search.trim()
                ? `No applicants match "${search.trim()}".`
                : tab === "ALL"
                  ? "No applicants yet."
                  : `No ${TABS.find((t) => t.value === tab)?.label.toLowerCase()} applicants yet.`}
            </Text>
          </Card>
        ) : (
          filtered.map((app) => (
            <Card key={app.id} style={styles.appCard}>
              <View style={styles.appHeader}>
                <Text style={styles.appName}>{app.applicant.name}</Text>
                <ApplicationStatusBadge status={app.status} />
              </View>
              <Text style={styles.appMeta}>Applied: {formatDate(app.createdAt)}</Text>
              <Button
                title="View Application"
                variant="outline"
                size="sm"
                onPress={() => (navigation as any).navigate("ApplicantDetails", { applicationId: app.id })}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
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
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.text,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing.md,
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  sortLabel: {
    alignSelf: "center",
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  appCard: {
    marginBottom: spacing.md,
  },
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  appName: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  appMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  centerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  centerText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
});
