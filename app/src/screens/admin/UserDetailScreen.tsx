import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as adminUserApi from "../../api/adminUserApi";
import { useAuth } from "../../context/AuthContext";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorState } from "../../components/common/ErrorState";
import { RejectionModal } from "../../components/common/RejectionModal";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate, formatRelativeDate } from "../../utils/formatters";
import { confirmAction } from "../../utils/confirm";
import { toast } from "../../utils/toast";
import { ROLE_LABELS, UserAvatar } from "./UserManagementScreen";
import type { AdminUserStackParamList } from "../../navigation/AdminStack";
import type { AdminUserDetail } from "../../types";

type Stat = { label: string; value: string | number; icon: keyof typeof Feather.glyphMap };

function statsFor(detail: AdminUserDetail): Stat[] {
  const { user, stats, reputation, warnings } = detail;
  const rating: Stat = {
    label: reputation.totalReviews ? `${reputation.totalReviews} review${reputation.totalReviews === 1 ? "" : "s"}` : "No reviews",
    value: reputation.averageRating ?? "—",
    icon: "star",
  };
  const warningStat: Stat = { label: "Warnings", value: warnings.total, icon: "alert-triangle" };
  if (user.role === "shopowner") {
    return [
      { label: "Gigs posted", value: stats.gigsPosted, icon: "briefcase" },
      { label: "Active gigs", value: stats.activeGigs, icon: "activity" },
      rating,
      warningStat,
    ];
  }
  if (user.role === "jobseeker") {
    return [
      { label: "Applications", value: stats.applications, icon: "send" },
      { label: "Hired", value: stats.hiredApplications, icon: "user-check" },
      { label: "Jobs completed", value: stats.completedJobs, icon: "check-circle" },
      rating,
      warningStat,
    ];
  }
  return [rating, warningStat];
}

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}

const InfoLine: React.FC<{ icon: keyof typeof Feather.glyphMap; text?: string | null }> = ({ icon, text }) =>
  text ? (
    <View style={styles.infoLine}>
      <Feather name={icon} size={13} color={colors.textMuted} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  ) : null;

export const UserDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<AdminUserStackParamList, "UserDetail">>();
  const { user: currentAdmin } = useAuth();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDetail(await adminUserApi.getUserDetail(params.userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this user.");
    }
  }, [params.userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const disable = async (reason: string) => {
    if (!detail) return;
    setSubmitting(true);
    try {
      await adminUserApi.disableUser(detail.user.id, reason);
      setShowDisableModal(false);
      toast.success("Account disabled", `${detail.user.name} has been signed out and can't sign in.`);
      await load();
    } catch (err) {
      toast.error("Could not disable account", err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const enable = () => {
    if (!detail) return;
    confirmAction(
      `Re-enable ${detail.user.name}?`,
      "They will be able to sign in again, and any gigs they posted will be visible to job seekers.",
      "Re-enable",
      async () => {
        setSubmitting(true);
        try {
          await adminUserApi.enableUser(detail.user.id);
          toast.success("Account re-enabled", `${detail.user.name} can sign in again.`);
          await load();
        } catch (err) {
          toast.error("Could not re-enable account", err instanceof Error ? err.message : undefined);
        } finally {
          setSubmitting(false);
        }
      }
    );
  };

  const header = (
    <AppHeader subtitle="User details" showBack onBackPress={() => navigation.goBack()} />
  );

  if (!detail) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        {header}
        {error ? <ErrorState message={error} onRetry={load} /> : <LoadingSpinner message="Loading user..." />}
      </SafeAreaView>
    );
  }

  const { user, verification, warnings, statusHistory } = detail;
  const isSelf = currentAdmin?.id === user.id;
  const canManage = user.role !== "admin" && !isSelf;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      {header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <UserAvatar user={user} size={56} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <View style={styles.badgeRow}>
                <TrustBadge label={ROLE_LABELS[user.role]} variant="primary" />
                <TrustBadge label={user.isDisabled ? "Disabled" : "Active"} variant={user.isDisabled ? "danger" : "success"} />
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <InfoLine icon="phone" text={user.phone} />
          <InfoLine icon="map-pin" text={user.location} />
          <InfoLine icon="calendar" text={`Joined ${formatDate(user.createdAt)}`} />
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </Card>

        {user.isDisabled ? (
          <Card variant="danger" style={styles.sectionCard}>
            <View style={styles.statusHeader}>
              <Feather name="slash" size={16} color={colors.danger} />
              <Text style={[styles.cardTitle, { color: colors.dangerText, marginLeft: spacing.xs }]}>Account disabled</Text>
            </View>
            {user.disabledAt ? <Text style={styles.muted}>Since {formatDate(user.disabledAt)}</Text> : null}
            {user.disabledReason ? <Text style={styles.reason}>{user.disabledReason}</Text> : null}
            <Text style={styles.muted}>
              They can't sign in{user.role === "shopowner" ? ", and their gigs are hidden from job seekers" : ""}.
            </Text>
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.statGrid}>
          {statsFor(detail).map((stat) => (
            <View key={stat.label} style={styles.statTile}>
              <Feather name={stat.icon} size={14} color={colors.primaryDark} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {verification.jobSeekerRequest || verification.verifierApplication ? (
          <>
            <Text style={styles.sectionTitle}>Verification</Text>
            <Card style={styles.sectionCard}>
              {verification.jobSeekerRequest ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Identity verification</Text>
                  <TrustBadge label={statusLabel(verification.jobSeekerRequest.status)} variant="muted" />
                </View>
              ) : null}
              {verification.verifierApplication ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Verifier application</Text>
                  <TrustBadge label={statusLabel(verification.verifierApplication.status)} variant="muted" />
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {warnings.recent.length ? (
          <>
            <Text style={styles.sectionTitle}>Recent warnings</Text>
            <Card style={styles.sectionCard}>
              {warnings.recent.map((warning, index) => (
                <View key={warning.id} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                  <Text style={styles.listText}>{warning.message}</Text>
                  <Text style={styles.muted}>{formatRelativeDate(warning.createdAt)}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Account history</Text>
        <Card style={styles.sectionCard}>
          {statusHistory.length === 0 ? (
            <Text style={styles.muted}>No admin actions on this account yet.</Text>
          ) : (
            statusHistory.map((event, index) => (
              <View key={event.id} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
                <View style={styles.statusHeader}>
                  <Feather
                    name={event.action === "DISABLED" ? "slash" : "user-check"}
                    size={13}
                    color={event.action === "DISABLED" ? colors.danger : colors.success}
                  />
                  <Text style={[styles.listText, { fontWeight: "700", marginLeft: spacing.xs }]}>
                    {event.action === "DISABLED" ? "Disabled" : "Re-enabled"} by {event.admin.name}
                  </Text>
                </View>
                {event.reason ? <Text style={styles.listText}>{event.reason}</Text> : null}
                <Text style={styles.muted}>{formatDate(event.createdAt)}</Text>
              </View>
            ))
          )}
        </Card>

        {canManage ? (
          user.isDisabled ? (
            <Button title="Re-enable account" icon="user-check" onPress={enable} loading={submitting} style={styles.action} />
          ) : (
            <Button
              title="Disable account"
              icon="slash"
              variant="danger"
              onPress={() => setShowDisableModal(true)}
              style={styles.action}
            />
          )
        ) : (
          <Text style={[styles.muted, styles.action, { textAlign: "center" }]}>
            {isSelf ? "You can't disable your own account." : "Admin accounts can't be disabled here."}
          </Text>
        )}

        <View style={{ height: spacing.xxl * 2 }} />
      </ScrollView>

      {/* Mounted only while open so the reason field starts empty every time. */}
      {showDisableModal ? (
        <RejectionModal
          visible
          onCancel={() => setShowDisableModal(false)}
          onSubmit={disable}
          submitting={submitting}
          title={`Disable ${user.name}?`}
          subtitle={`They will be signed out and can't sign in until you re-enable the account${
            user.role === "shopowner" ? ". Their gigs will be hidden from job seekers" : ""
          }. The reason is emailed to them.`}
          placeholder="Reason for disabling this account..."
          submitLabel="Disable account"
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: spacing.md },
  profileCard: { padding: spacing.md, marginBottom: spacing.md },
  profileRow: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: typography.sizes.md, fontWeight: "800", color: colors.text },
  email: { fontSize: typography.sizes.sm, color: colors.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  infoLine: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  infoText: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginLeft: spacing.sm },
  bio: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionCard: { padding: spacing.md, marginBottom: spacing.md },
  cardTitle: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.text },
  statusHeader: { flexDirection: "row", alignItems: "center" },
  reason: { fontSize: typography.sizes.sm, color: colors.text, marginVertical: spacing.sm, lineHeight: 20 },
  muted: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: 2 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  statTile: {
    flexGrow: 1,
    flexBasis: "30%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  statValue: { fontSize: typography.sizes.md, fontWeight: "800", color: colors.text, marginTop: spacing.xs },
  statLabel: { fontSize: typography.sizes.xxs, color: colors.textMuted, marginTop: 2 },
  kvRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.xs },
  kvLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  listItem: { paddingVertical: spacing.sm },
  listItemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  listText: { fontSize: typography.sizes.sm, color: colors.text, marginTop: 2 },
  action: { marginTop: spacing.sm },
});
