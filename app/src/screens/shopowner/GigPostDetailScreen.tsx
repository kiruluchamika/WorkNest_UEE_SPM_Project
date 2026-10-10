import React, { useCallback, useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useGigPosts } from "../../context/GigPostContext";
import * as applicationsApi from "../../api/applicationsApi";
import * as applicationSettingsApi from "../../api/applicationSettingsApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorState } from "../../components/common/ErrorState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { SectionHeader } from "../../components/common/SectionHeader";
import { InfoRow } from "../../components/common/InfoRow";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import { APPLICATION_MODE_OPTIONS } from "../../utils/applicationSettings";
import type { ApplicationMode, JobApplicationStatus } from "../../types";

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

function applicationModeLabel(value: ApplicationMode): string {
  return APPLICATION_MODE_OPTIONS.find((mode) => mode.value === value)?.label ?? value;
}

export const GigPostDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gigId } = (route.params as { gigId: string }) || {};
  const { gigPosts, refresh, closeGig, removeGig, resubmitGig, completeGig } = useGigPosts();
  const [busy, setBusy] = useState(false);
  const [settingsMode, setSettingsMode] = useState<ApplicationMode | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [applicationCounts, setApplicationCounts] = useState<Record<JobApplicationStatus, number>>({
    PENDING: 0,
    SHORTLISTED: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
    COMPLETED: 0,
  });

  const gig = gigPosts.find((g) => g.id === gigId);

  const loadApplicationSummary = useCallback(async () => {
    if (!gigId) return;

    try {
      const [settings, applicants] = await Promise.all([
        applicationSettingsApi.getPublicApplicationSettings(gigId).catch(() => null),
        applicationsApi.getGigApplicants(gigId).catch(() => []),
      ]);

      if (settings?.applicationMode) {
        setSettingsMode(settings.applicationMode);
      }
      setSettingsLoaded(true);


      const nextCounts: Record<JobApplicationStatus, number> = {
        PENDING: 0,
        SHORTLISTED: 0,
        HIRED: 0,
        REJECTED: 0,
        WITHDRAWN: 0,
        COMPLETED: 0,
      };

      applicants.forEach((item) => {
        nextCounts[item.status] = (nextCounts[item.status] ?? 0) + 1;
      });

      setApplicationCounts(nextCounts);
    } catch {
      setSettingsLoaded(true);
    }
  }, [gigId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadApplicationSummary();
    }, [refresh, loadApplicationSummary])
  );

  const handleClose = () => {
    if (!gig) return;
    Alert.alert("Close Gig", "Are you sure you want to close this gig? Workers will no longer be able to apply.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close Gig",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await closeGig(gig.id);
            await refresh();
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "Failed to close gig");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!gig) return;
    Alert.alert("Delete Gig", "Are you sure you want to delete this gig? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await removeGig(gig.id);
            navigation.goBack();
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete gig");
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleResubmit = async () => {
    if (!gig) return;
    setBusy(true);
    try {
      await resubmitGig(gig.id);
      Alert.alert("Resubmitted", "Your gig has been resubmitted for admin review.");
      await refresh();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to resubmit gig");
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = () => {
    if (!gig) return;
    Alert.alert(
      "Complete Gig",
      "Marking this gig complete indicates all agreed work has concluded. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Complete",
          onPress: async () => {
            setBusy(true);
            try {
              await completeGig(gig.id);
              await refresh();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to complete gig");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (!gig) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <ErrorState
          title="Gig not found"
          message="This gig post may have been deleted or moved."
          onGoBack={() => navigation.goBack()}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  const filledPositions = (gig.filledPositions ?? (applicationCounts.HIRED + applicationCounts.COMPLETED));
  const remainingWorkers = Math.max(gig.workersNeeded - filledPositions, 0);
  const totalApplicants =
    applicationCounts.PENDING +
    applicationCounts.SHORTLISTED +
    applicationCounts.HIRED +
    applicationCounts.REJECTED +
    applicationCounts.WITHDRAWN +
    applicationCounts.COMPLETED;

  const schedule = [
    formatDate(gig.startDate),
    gig.endDate ? `- ${formatDate(gig.endDate)}` : null,
    gig.startTime ? `(${gig.startTime}${gig.endTime ? ` - ${gig.endTime}` : ""})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
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
          <Text style={styles.navTitle}>Gig Management</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Rejection Notice Banner */}
        {gig.status === "REJECTED" && gig.rejectionReason ? (
          <Card style={styles.rejectionCard} variant="warning">
            <View style={styles.rejectionHeader}>
              <Feather name="alert-triangle" size={18} color={colors.warningText} />
              <Text style={styles.rejectionTitle}>Gig Needs Changes</Text>
            </View>
            <Text style={styles.rejectionText}>{gig.rejectionReason}</Text>
            <Text style={styles.rejectionHint}>
              Edit your gig details according to the feedback above and tap Resubmit for Review.
            </Text>
          </Card>
        ) : null}

        {/* Hero Card */}
        <Card style={styles.card}>
          {gig.imageUrl ? (
            <Image source={{ uri: gig.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : null}

          <View style={styles.headerRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{gig.category?.name ?? "General"}</Text>
            </View>
            <StatusBadge status={gig.status} />
          </View>

          <Text style={styles.title}>{gig.title}</Text>
          <Text style={styles.description}>{gig.description}</Text>
        </Card>

        {/* Applicant Management & Capacity Dashboard Card */}
        <Card style={styles.card}>
          <SectionHeader
            title="Applicant Management"
            subtitle={
              settingsLoaded
                ? settingsMode
                  ? `${applicationModeLabel(settingsMode)} configured`
                  : "Settings not configured"
                : "Loading settings..."
            }
            count={totalApplicants}
          />

          {/* Capacity Progress Metrics */}
          <View style={styles.capacityGrid}>
            <View style={styles.capacityBox}>
              <Text style={styles.capacityValue}>{gig.workersNeeded}</Text>
              <Text style={styles.capacityLabel}>Needed</Text>
            </View>
            <View style={styles.capacityBox}>
              <Text style={[styles.capacityValue, { color: colors.successText }]}>
                {filledPositions}
              </Text>
              <Text style={styles.capacityLabel}>Filled</Text>
            </View>
            <View style={styles.capacityBox}>
              <Text
                style={[
                  styles.capacityValue,
                  remainingWorkers === 0 ? { color: colors.warningText } : { color: colors.primaryDark },
                ]}
              >
                {remainingWorkers}
              </Text>
              <Text style={styles.capacityLabel}>Remaining</Text>
            </View>
          </View>

          {remainingWorkers === 0 ? (
            <View style={styles.capacityNotice}>
              <Feather name="check-circle" size={14} color={colors.successText} />
              <Text style={styles.capacityNoticeText}>
                All available positions have been filled.
              </Text>
            </View>
          ) : null}

          <View style={styles.manageButtonsWrap}>
            <Button
              title={`View Applicants (${totalApplicants})`}
              icon="users"
              variant="primary"
              onPress={() => (navigation as any).navigate("GigApplicants", { gigId: gig.id })}
              style={{ marginBottom: spacing.xs + 2 }}
            />
            <Button
              title="Configure Application Settings"
              icon="settings"
              variant="secondary"
              onPress={() => (navigation as any).navigate("ApplicationSettings", { gigId: gig.id })}
            />
          </View>
        </Card>

        {/* Gig Parameters Card */}
        <Card style={styles.card}>
          <SectionHeader title="Gig Parameters" />
          <InfoRow
            icon="dollar-sign"
            label="Payment Rate"
            value={`${formatCurrency(gig.paymentAmount)} / ${paymentTypeLabel(gig.paymentType)}`}
          />
          <InfoRow icon="map-pin" label="Location" value={gig.location} />
          <InfoRow icon="calendar" label="Schedule" value={schedule || "Not specified"} />
          <InfoRow
            icon="award"
            label="Required Skills"
            value={gig.requiredSkills.length ? gig.requiredSkills.join(", ") : "None specified"}
          />
          <InfoRow
            icon="phone"
            label="Contact Info"
            value={gig.contactInfo || "Not provided"}
          />
          <InfoRow icon="clock" label="Posted On" value={formatDate(gig.createdAt)} />
        </Card>

        {/* Gig Actions Section */}
        <View style={styles.actionsBlock}>
          {gig.status !== "CLOSED" ? (
            <Button
              title="Edit Gig Details"
              icon="edit-2"
              variant="outline"
              onPress={() => (navigation as any).navigate("GigForm", { gigId: gig.id })}
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}

          {gig.status === "ACTIVE" ? (
            <Button
              title="Mark Gig Completed"
              icon="award"
              variant="secondary"
              onPress={handleComplete}
              disabled={busy}
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}

          {gig.status === "ACTIVE" ? (
            <Button
              title="Close Gig to Applications"
              icon="lock"
              variant="secondary"
              onPress={handleClose}
              disabled={busy}
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}

          {gig.status === "REJECTED" ? (
            <Button
              title="Resubmit for Review"
              icon="rotate-ccw"
              onPress={handleResubmit}
              disabled={busy}
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}

          <Button
            title="Delete Gig"
            icon="trash-2"
            variant="danger"
            onPress={handleDelete}
            disabled={busy}
          />
        </View>

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
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
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
  heroImage: {
    width: "100%",
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.cream,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 26,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  rejectionCard: {
    marginBottom: spacing.md,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  rejectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.warningText,
  },
  rejectionText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  rejectionHint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  capacityGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  capacityBox: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    alignItems: "center",
  },
  capacityValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
  },
  capacityLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  capacityNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  capacityNoticeText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.successText,
  },
  manageButtonsWrap: {
    marginTop: spacing.xs,
  },
  actionsBlock: {
    marginTop: spacing.xs,
  },
});
