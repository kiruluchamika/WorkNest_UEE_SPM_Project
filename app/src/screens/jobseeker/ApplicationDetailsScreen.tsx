import React, { useCallback, useState } from "react";
import { toast } from "../../utils/toast";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as applicationsApi from "../../api/applicationsApi";
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
import { formatAnswerValue, formatYesNo } from "../../utils/applicationDisplay";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import { confirmAction } from "../../utils/confirm";
import type { ApplicationDetail, JobApplicationStatus } from "../../types";

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

const STATUS_EXPLANATIONS: Record<JobApplicationStatus, { title: string; message: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  PENDING: {
    title: "Application Under Review",
    message: "The employer has received your application and will review your profile shortly.",
    icon: "clock",
    color: colors.warningText,
  },
  SHORTLISTED: {
    title: "You Are Shortlisted!",
    message: "Great news! The employer has shortlisted your application for final consideration.",
    icon: "star",
    color: colors.infoText,
  },
  HIRED: {
    title: "You're Hired for this Gig!",
    message: "Congratulations! You were selected for this gig. Be ready for the scheduled work time.",
    icon: "check-circle",
    color: colors.successText,
  },
  COMPLETED: {
    title: "Gig Completed",
    message: "This gig has concluded. Thank you for your hard work!",
    icon: "award",
    color: colors.purpleText,
  },
  REJECTED: {
    title: "Application Not Selected",
    message: "The employer has decided to proceed with other applicants for this position.",
    icon: "x-circle",
    color: colors.dangerText,
  },
  WITHDRAWN: {
    title: "Application Withdrawn",
    message: "You have withdrawn this application. It is no longer under consideration.",
    icon: "slash",
    color: colors.neutralText,
  },
};

async function openExternalUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    toast.error("Invalid Link", "This link must start with http:// or https://.");
    return;
  }

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    toast.error("Cannot Open Link", "This link could not be opened on your device.");
    return;
  }

  await Linking.openURL(url);
}

export const ApplicationDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { applicationId } = (route.params as { applicationId: string }) || {};

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    if (!applicationId) {
      setLoadError("This application could not be identified.");
      setLoading(false);
      return;
    }
    try {
      const data = await applicationsApi.getApplicationById(applicationId);
      setApplication(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this application.");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleWithdraw = () => {
    if (!applicationId) return;
    confirmAction(
      "Withdraw application?",
      "Are you sure you want to withdraw this application? This action cannot be undone.",
      "Withdraw",
      async () => {
        setWithdrawing(true);
        try {
          await applicationsApi.withdrawApplication(applicationId);
          await load();
        } catch (err) {
          toast.error("Could not withdraw", err instanceof Error ? err.message : "Please try again.");
        } finally {
          setWithdrawing(false);
        }
      },
      { destructive: true }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading application details..." fullScreen />
      </SafeAreaView>
    );
  }

  if (loadError || !application) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <ErrorState
          title="Application not found"
          message={loadError ?? "This application may have been removed."}
          onRetry={load}
          onGoBack={() => navigation.goBack()}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  const schedule = [
    formatDate(application.gig.startDate),
    application.gig.endDate ? `- ${formatDate(application.gig.endDate)}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const canWithdraw = application.status === "PENDING" || application.status === "SHORTLISTED";
  const statusInfo = STATUS_EXPLANATIONS[application.status];

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
          <Text style={styles.navTitle}>Application Details</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Status Highlight Banner */}
        <Card style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View style={styles.statusIconWrap}>
              <Feather name={statusInfo.icon} size={20} color={statusInfo.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
                {statusInfo.title}
              </Text>
              <Text style={styles.statusMessage}>{statusInfo.message}</Text>
            </View>
          </View>
        </Card>

        {/* Gig Summary Card */}
        <Card style={styles.card}>
          <View style={styles.gigHeader}>
            <Text style={styles.gigTitle} numberOfLines={2}>
              {application.gig.title}
            </Text>
            <StatusBadge status={application.status} />
          </View>

          <View style={styles.metaRow}>
            <Feather name="map-pin" size={13} color={colors.textMuted} />
            <Text style={styles.gigMeta}>{application.gig.location}</Text>
          </View>

          {schedule ? (
            <View style={styles.metaRow}>
              <Feather name="calendar" size={13} color={colors.textMuted} />
              <Text style={styles.gigMeta}>{schedule}</Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Feather name="dollar-sign" size={13} color={colors.textMuted} />
            <Text style={styles.gigPayment}>
              {formatCurrency(application.gig.paymentAmount)} / {paymentTypeLabel(application.gig.paymentType)}
            </Text>
          </View>

          <View style={styles.appliedDateRow}>
            <Text style={styles.appliedDateText}>
              Submitted on {formatDate(application.createdAt)}
            </Text>
          </View>
        </Card>

        {/* Submitted Application Information */}
        <Card style={styles.card}>
          <SectionHeader title="Your Submission" />

          {application.experience ? (
            <InfoRow label="Relevant Experience" value={application.experience} />
          ) : null}

          {application.availability ? (
            <InfoRow label="Availability" value={application.availability} />
          ) : null}

          {application.transportation !== undefined ? (
            <InfoRow
              label="Reliable Transportation"
              value={formatYesNo(application.transportation)}
            />
          ) : null}

          {application.expectedSalary !== undefined ? (
            <InfoRow
              label="Expected Pay"
              value={formatCurrency(application.expectedSalary)}
            />
          ) : null}

          {application.shortMessage ? (
            <InfoRow label="Short Message" value={application.shortMessage} />
          ) : null}

          {application.coverLetter ? (
            <InfoRow label="Cover Letter" value={application.coverLetter} />
          ) : null}

          {application.cvUrl ? (
            <InfoRow
              icon="file-text"
              label="CV / Resume"
              value="Open Submitted CV"
              isLink
              onPress={() => openExternalUrl(application.cvUrl as string)}
            />
          ) : null}

          {application.portfolioUrl ? (
            <InfoRow
              icon="globe"
              label="Portfolio / Website"
              value="Open Portfolio Link"
              isLink
              onPress={() => openExternalUrl(application.portfolioUrl as string)}
            />
          ) : null}
        </Card>

        {/* Screening Questions Answers */}
        {application.answers.length > 0 ? (
          <Card style={styles.card}>
            <SectionHeader
              title="Screening Question Answers"
              count={application.answers.length}
            />
            {application.answers.map((a, index) => (
              <InfoRow
                key={a.questionId ?? index}
                label={a.question ?? `Question ${index + 1}`}
                value={formatAnswerValue(a.answer)}
              />
            ))}
          </Card>
        ) : null}

        {/* Actions */}
        {canWithdraw ? (
          <View style={styles.actionContainer}>
            <Button
              title="Withdraw Application"
              icon="slash"
              variant="danger"
              onPress={handleWithdraw}
              disabled={withdrawing}
              loading={withdrawing}
            />
          </View>
        ) : application.status === "COMPLETED" && application.gig.business ? (
          <View style={styles.actionContainer}>
            <Button
              title="Leave a Review for Business"
              icon="star"
              onPress={() =>
                (navigation as any).navigate("ReviewForm", {
                  gigId: application.gig.id,
                  revieweeId: application.gig.business!.id,
                  revieweeName: application.gig.business!.name,
                })
              }
            />
          </View>
        ) : null}

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
  statusCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  statusTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 2,
  },
  statusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  statusTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    marginBottom: 2,
  },
  statusMessage: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  card: {
    marginBottom: spacing.md,
  },
  gigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.xs + 2,
  },
  gigMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  gigPayment: {
    fontSize: typography.sizes.xs,
    color: colors.successText,
    fontWeight: "700",
  },
  appliedDateRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  appliedDateText: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    fontWeight: "500",
  },
  actionContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
