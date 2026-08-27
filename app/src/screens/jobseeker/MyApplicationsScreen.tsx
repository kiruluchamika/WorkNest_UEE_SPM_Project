import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as applicationsApi from "../../api/applicationsApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ApplicationStatusBadge } from "../../components/applications/ApplicationStatusBadge";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate } from "../../utils/formatters";
import type { JobApplicationStatus, MyApplicationListItem } from "../../types";

type FilterTab = "ALL" | JobApplicationStatus;

const TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "HIRED", label: "Hired" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

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

  const filtered = useMemo(
    () => (tab === "ALL" ? applications : applications.filter((a) => a.status === tab)),
    [applications, tab]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>My Applications</Text>

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

        {loading ? (
          <LoadingSpinner message="Loading your applications..." />
        ) : loadError ? (
          <Card style={styles.emptyCard}>
            <Feather name="alert-triangle" size={22} color={colors.danger} />
            <Text style={styles.emptyTitle}>Couldn&apos;t load applications</Text>
            <Text style={styles.emptyText}>{loadError}</Text>
          </Card>
        ) : filtered.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="file-text" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.emptyTitle}>
              {tab === "ALL" ? "No applications yet" : `No ${tab.toLowerCase()} applications`}
            </Text>
            <Text style={styles.emptyText}>
              {tab === "ALL"
                ? "Jobs you apply for will appear here."
                : "Applications in this status will appear here."}
            </Text>
          </Card>
        ) : (
          filtered.map((app) => (
            <Card key={app.id} style={styles.appCard}>
              <View style={styles.appHeader}>
                <Text style={styles.appTitle} numberOfLines={1}>
                  {app.gig.title}
                </Text>
                <ApplicationStatusBadge status={app.status} />
              </View>
              <Text style={styles.appMeta}>{app.gig.location}</Text>
              <Text style={styles.appMeta}>Applied: {formatDate(app.createdAt)}</Text>
              <Button
                title="View Application"
                variant="outline"
                size="sm"
                onPress={() => (navigation as any).navigate("ApplicationDetails", { applicationId: app.id })}
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
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.text,
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
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  appCard: {
    marginBottom: spacing.md,
  },
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  appTitle: {
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
});
