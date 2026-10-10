import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as adminReportApi from "../../api/adminReportApi";
import type { AdminReport, ReportCustomerRole, ReportMonitoringItem, ReportRange } from "../../api/adminReportApi";
import { listAllCategories } from "../../api/categoryApi";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { ErrorState } from "../../components/common/ErrorState";
import { FilterChips, FilterOption } from "../../components/common/FilterChips";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { BarList, ColumnChart, StackedBar } from "../../components/admin/ReportCharts";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { Category } from "../../types";

type Section = "overview" | "gigs" | "customers" | "monitor";
type RoleFilter = ReportCustomerRole | "all";

const ALL_CATEGORIES = "all";

const RANGE_OPTIONS: FilterOption<ReportRange>[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const RANGE_PHRASE: Record<ReportRange, string> = {
  "7d": "in the last 7 days",
  "30d": "in the last 30 days",
  "90d": "in the last 90 days",
  all: "since launch",
};

const ROLE_OPTIONS: FilterOption<RoleFilter>[] = [
  { value: "all", label: "All customers" },
  { value: "jobseeker", label: "Job seekers" },
  { value: "shopowner", label: "Shop owners" },
  { value: "verifier", label: "Verifiers" },
];

// Fixed colour orders for the stacked bars; see SERIES_COLORS.
const GIG_STATUS_ORDER = ["PENDING", "ACTIVE", "COMPLETED", "CLOSED", "REJECTED"];
const APPLICATION_STATUS_ORDER = ["PENDING", "SHORTLISTED", "HIRED", "COMPLETED", "REJECTED", "WITHDRAWN"];
const ROLE_ORDER = ["jobseeker", "shopowner", "verifier"];

// Where each monitoring item is handled. Items without an entry have no screen to act on.
const MONITOR_TARGETS: Record<string, { tab?: string; icon: keyof typeof Feather.glyphMap }> = {
  pendingGigs: { icon: "briefcase" },
  pendingReports: { tab: "ReviewsTab", icon: "flag" },
  flaggedReviews: { tab: "ReviewsTab", icon: "message-square" },
  pendingVerifierApplications: { tab: "VerifierRequestsTab", icon: "user-check" },
  verificationCasesForAdmin: { tab: "VerificationOverviewTab", icon: "alert-triangle" },
  unassignedVerificationRequests: { tab: "VerificationOverviewTab", icon: "inbox" },
  pendingReactivationRequests: { tab: "VerificationOverviewTab", icon: "rotate-ccw" },
  suspendedVerifiers: { tab: "VerificationOverviewTab", icon: "user-x" },
  failedEmails: { icon: "mail" },
};

function formatPercent(value: number | null): string {
  return value === null ? "–" : `${value}%`;
}

const StatTile: React.FC<{ label: string; value: string | number; hint?: string }> = ({ label, value, hint }) => (
  <View style={styles.tile}>
    <Text style={styles.tileLabel}>{label}</Text>
    <Text style={styles.tileValue}>{value}</Text>
    {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
  </View>
);

const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <Card style={styles.chartCard}>
    <Text style={styles.chartTitle}>{title}</Text>
    {subtitle ? <Text style={styles.chartSubtitle}>{subtitle}</Text> : null}
    <View style={styles.chartBody}>{children}</View>
  </Card>
);

export const ReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [section, setSection] = useState<Section>("overview");
  const [range, setRange] = useState<ReportRange>("30d");
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const [role, setRole] = useState<RoleFilter>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Filters can change faster than the server answers; only the latest request may update the screen.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminReportApi.getAdminReport({
        range,
        categoryId: categoryId === ALL_CATEGORIES ? undefined : categoryId,
        role: role === "all" ? undefined : role,
      });
      if (requestId === latestRequest.current) setReport(result);
    } catch (err) {
      if (requestId === latestRequest.current) {
        setError(err instanceof Error ? err.message : "Could not load the report.");
      }
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, [range, categoryId, role]);

  useEffect(() => {
    load();
  }, [load]);

  // The category filter is optional, so a failure here just leaves it with "All categories".
  useEffect(() => {
    listAllCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const attentionCount = report ? report.monitoring.filter((item) => item.count > 0).length : 0;

  const sectionOptions: FilterOption<Section>[] = [
    { value: "overview", label: "Overview", icon: "pie-chart" },
    { value: "gigs", label: "Gigs", icon: "briefcase" },
    { value: "customers", label: "Customers", icon: "users" },
    { value: "monitor", label: "Monitor", icon: "activity", count: attentionCount > 0 ? attentionCount : undefined },
  ];

  const categoryOptions: FilterOption<string>[] = [
    { value: ALL_CATEGORIES, label: "All categories" },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

  const openMonitorItem = (item: ReportMonitoringItem) => {
    if (item.key === "pendingGigs") {
      navigation.goBack();
      return;
    }
    const tab = MONITOR_TARGETS[item.key]?.tab;
    if (tab) (navigation as any).getParent()?.navigate(tab);
  };

  const renderOverview = (data: AdminReport) => {
    const needsAttention = data.monitoring.filter((item) => item.count > 0).slice(0, 3);
    return (
      <>
        <View style={styles.tileGrid}>
          <StatTile label="Gigs posted" value={data.overview.gigsPosted} hint={`${data.overview.completedGigs} completed`} />
          <StatTile label="New customers" value={data.overview.newCustomers} hint={`${data.customers.total} in total`} />
          <StatTile label="Applications" value={data.overview.applications} hint={`${formatPercent(data.overview.hireRate)} hired`} />
          <StatTile label="Gig approval rate" value={formatPercent(data.overview.approvalRate)} hint="of reviewed gigs" />
          <StatTile
            label="Average rating"
            value={data.overview.averageRating === null ? "–" : `${data.overview.averageRating} / 5`}
            hint={`${data.overview.reviews} review${data.overview.reviews === 1 ? "" : "s"}`}
          />
          <StatTile label="Needs attention" value={attentionCount} hint="open admin tasks" />
        </View>

        <ChartCard title="Gigs posted" subtitle={`New gig posts ${RANGE_PHRASE[range]}`}>
          <ColumnChart points={data.gigs.trend} unit="gigs" />
        </ChartCard>

        <ChartCard title="New customers" subtitle={`Registrations ${RANGE_PHRASE[range]}`}>
          <ColumnChart points={data.customers.trend} unit="sign-ups" />
        </ChartCard>

        {needsAttention.length > 0 ? (
          <ChartCard title="Needs attention now" subtitle="Open the Monitor tab for the full list">
            {needsAttention.map((item) => renderMonitorRow(item))}
          </ChartCard>
        ) : null}
      </>
    );
  };

  const renderGigs = (data: AdminReport) => (
    <>
      <Text style={styles.filterLabel}>Filter by category</Text>
      <FilterChips options={categoryOptions} selected={categoryId} onSelect={setCategoryId} style={styles.filterRow} />

      <View style={styles.tileGrid}>
        <StatTile label="Gigs posted" value={data.gigs.total} />
        <StatTile label="Applications" value={data.applications.total} />
        <StatTile label="Approval rate" value={formatPercent(data.overview.approvalRate)} hint="of reviewed gigs" />
        <StatTile label="Hire rate" value={formatPercent(data.overview.hireRate)} hint="of applications" />
      </View>

      <ChartCard title="Gigs by status" subtitle={`Gigs posted ${RANGE_PHRASE[range]}`}>
        <StackedBar items={data.gigs.byStatus} colorOrder={GIG_STATUS_ORDER} />
      </ChartCard>

      <ChartCard title="Gigs posted over time">
        <ColumnChart points={data.gigs.trend} unit="gigs" />
      </ChartCard>

      <ChartCard title="Top categories" subtitle="By number of gigs posted">
        <BarList items={data.gigs.byCategory} />
      </ChartCard>

      <ChartCard title="Top locations" subtitle="Where gigs are being posted">
        <BarList items={data.gigs.topLocations} />
      </ChartCard>

      <ChartCard title="Applications by status" subtitle="What happened to applications on these gigs">
        <StackedBar items={data.applications.byStatus} colorOrder={APPLICATION_STATUS_ORDER} />
      </ChartCard>
    </>
  );

  const renderCustomers = (data: AdminReport) => (
    <>
      <Text style={styles.filterLabel}>Filter by customer type</Text>
      <FilterChips options={ROLE_OPTIONS} selected={role} onSelect={setRole} style={styles.filterRow} />

      <View style={styles.tileGrid}>
        <StatTile label="Total customers" value={data.customers.total} hint="all time" />
        <StatTile label="New customers" value={data.customers.newInRange} hint={RANGE_PHRASE[range]} />
      </View>

      <ChartCard title="Customers by type" subtitle="Everyone registered, all time">
        <StackedBar items={data.customers.byRole} colorOrder={ROLE_ORDER} />
      </ChartCard>

      <ChartCard title="New registrations over time">
        <ColumnChart points={data.customers.trend} unit="sign-ups" />
      </ChartCard>

      {role === "all" || role === "shopowner" ? (
        <ChartCard title="Most active shop owners" subtitle={`By gigs posted ${RANGE_PHRASE[range]}`}>
          <BarList items={data.customers.topBusinesses} emptyMessage="No gigs were posted in this period." />
        </ChartCard>
      ) : null}

      {role === "all" || role === "jobseeker" ? (
        <ChartCard title="Most active job seekers" subtitle={`By applications sent ${RANGE_PHRASE[range]}`}>
          <BarList items={data.customers.topApplicants} emptyMessage="No applications were sent in this period." />
        </ChartCard>
      ) : null}
    </>
  );

  const renderMonitorRow = (item: ReportMonitoringItem) => {
    const target = MONITOR_TARGETS[item.key];
    const needsAttention = item.count > 0;
    const canOpen = needsAttention && (item.key === "pendingGigs" || Boolean(target?.tab));
    return (
      <TouchableOpacity
        key={item.key}
        style={styles.monitorRow}
        activeOpacity={0.75}
        disabled={!canOpen}
        onPress={() => openMonitorItem(item)}
        accessibilityRole={canOpen ? "button" : "text"}
        accessibilityLabel={`${item.label}: ${item.count}. ${needsAttention ? "Needs attention" : "All clear"}`}
      >
        <View style={[styles.monitorIcon, needsAttention ? styles.monitorIconAlert : styles.monitorIconClear]}>
          <Feather
            name={needsAttention ? target?.icon ?? "alert-circle" : "check"}
            size={15}
            color={needsAttention ? colors.warningText : colors.successText}
          />
        </View>
        <View style={styles.monitorCopy}>
          <Text style={styles.monitorLabel}>{item.label}</Text>
          <Text style={styles.monitorHint}>{needsAttention ? item.hint : "All clear"}</Text>
        </View>
        <Text style={[styles.monitorCount, !needsAttention && styles.monitorCountClear]}>{item.count}</Text>
        {canOpen ? <Feather name="chevron-right" size={16} color={colors.textMuted} /> : <View style={styles.chevronSpacer} />}
      </TouchableOpacity>
    );
  };

  const renderMonitor = (data: AdminReport) => {
    // Open tasks first, so the admin sees what to act on without scrolling.
    const sorted = [...data.monitoring].sort((a, b) => Number(b.count > 0) - Number(a.count > 0));
    return (
      <>
        <Card variant={attentionCount > 0 ? "warning" : "highlight"} style={styles.monitorSummary}>
          <Text style={styles.monitorSummaryTitle}>
            {attentionCount > 0
              ? `${attentionCount} area${attentionCount === 1 ? "" : "s"} need${attentionCount === 1 ? "s" : ""} your attention`
              : "Everything is up to date"}
          </Text>
          <Text style={styles.monitorSummaryText}>
            These are live counts of work waiting right now, so the date range does not apply here.
          </Text>
        </Card>
        <Card style={styles.chartCard}>{sorted.map((item) => renderMonitorRow(item))}</Card>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader
        title="Reports"
        subtitle="Platform summary"
        showBack
        onBackPress={() => navigation.goBack()}
        onBellPress={() => (navigation as any).getParent()?.navigate("NotificationsTab")}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <FilterChips options={sectionOptions} selected={section} onSelect={setSection} style={styles.filterRow} />

        {section !== "monitor" ? (
          <View style={styles.rangeRow}>
            <FilterChips options={RANGE_OPTIONS} selected={range} onSelect={setRange} style={styles.rangeChips} />
            {isLoading && report ? <ActivityIndicator size="small" color={colors.primaryDark} /> : null}
          </View>
        ) : null}

        {!report && isLoading ? (
          <LoadingSpinner message="Loading report..." />
        ) : !report ? (
          <ErrorState message={error ?? undefined} onRetry={load} />
        ) : (
          <>
            {error ? <Text style={styles.staleNotice}>Could not refresh. Showing the last loaded report.</Text> : null}
            {section === "overview" ? renderOverview(report) : null}
            {section === "gigs" ? renderGigs(report) : null}
            {section === "customers" ? renderCustomers(report) : null}
            {section === "monitor" ? renderMonitor(report) : null}
          </>
        )}

        <View style={{ height: spacing.xxl * 2 }} />
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
  filterRow: {
    marginBottom: spacing.sm,
  },
  filterLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textMuted,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  rangeChips: {
    flex: 1,
  },
  staleNotice: {
    fontSize: typography.sizes.xs,
    color: colors.dangerText,
    marginBottom: spacing.sm,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "48.5%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  tileLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: "600",
  },
  tileValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  tileHint: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    marginTop: 2,
  },
  chartCard: {
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
  },
  chartSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  chartBody: {
    marginTop: spacing.md,
  },
  monitorSummary: {
    marginBottom: spacing.md,
  },
  monitorSummaryTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  monitorSummaryText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  monitorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  monitorIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  monitorIconAlert: {
    backgroundColor: colors.warningLight,
  },
  monitorIconClear: {
    backgroundColor: colors.successLight,
  },
  monitorCopy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  monitorLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  monitorHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  monitorCount: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.text,
    marginRight: spacing.xs,
  },
  monitorCountClear: {
    color: colors.textMuted,
  },
  chevronSpacer: {
    width: 16,
  },
});
