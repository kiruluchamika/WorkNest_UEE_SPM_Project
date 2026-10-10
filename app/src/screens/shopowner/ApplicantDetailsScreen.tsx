import { toast } from "../../utils/toast";
import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
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
import { RejectionModal } from "../../components/common/RejectionModal";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { formatAnswerValue, formatYesNo } from "../../utils/applicationDisplay";
import type { ApplicationDetail } from "../../types";

async function openExternalUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    toast.error("Invalid Link", "This link must start with http:// or https://.");
    return;
  }

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    toast.error("Cannot Open Link", "This link could not be opened on this device.");
    return;
  }

  await Linking.openURL(url);
}

export const ApplicantDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { applicationId } = (route.params as { applicationId: string }) || {};

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

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
      setLoadError(err instanceof Error ? err.message : "Could not load this applicant.");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleShortlist = async () => {
    if (!applicationId) return;
    setActionInFlight("shortlist");
    try {
      await applicationsApi.shortlistApplication(applicationId);
      await load();
    } catch (err) {
      toast.error("Could not shortlist", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setActionInFlight(null);
    }
  };

  const handleHire = async () => {
    if (!applicationId) return;
    Alert.alert("Hire Applicant", "Are you sure you want to hire this applicant for the gig?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm Hire",
        onPress: async () => {
          setActionInFlight("hire");
          try {
            await applicationsApi.hireApplication(applicationId);
            await load();
          } catch (err) {
            toast.error("Could not hire", err instanceof Error ? err.message : "Please try again.");
          } finally {
            setActionInFlight(null);
          }
        },
      },
    ]);
  };

  const handleRejectSubmit = async (_reason: string) => {
    if (!applicationId) return;
    setActionInFlight("reject");
    try {
      await applicationsApi.rejectApplication(applicationId);
      setRejectModalVisible(false);
      await load();
    } catch (err) {
      Alert.alert("Could not reject", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setActionInFlight(null);
    }
  };

  const handleComplete = async () => {
    if (!applicationId) return;
    Alert.alert(
      "Mark Work Completed",
      "Confirm that this worker has completed the agreed gig work?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Completed",
          onPress: async () => {
            setActionInFlight("complete");
            try {
              await applicationsApi.completeApplication(applicationId);
              await load();
            } catch (err) {
              toast.error("Could not complete", err instanceof Error ? err.message : "Please try again.");
            } finally {
              setActionInFlight(null);
            }
          },
        },
      ]
    );
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading applicant profile..." fullScreen />
      </SafeAreaView>
    );
  }

  if (loadError || !application) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <ErrorState
          title="Applicant profile not found"
          message={loadError ?? "Something went wrong."}
          onRetry={load}
          onGoBack={() => navigation.goBack()}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  const applicant = application.applicant;
  const busy = actionInFlight !== null;
  const workersNeeded = application.gig.workersNeeded ?? 0;
  const filledPositions = application.gig.filledPositions ?? 0;
  const capacityFull = workersNeeded > 0 && filledPositions >= workersNeeded;

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
          <Text style={styles.navTitle}>Applicant Review</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Applicant Profile Card */}
        {applicant ? (
          <Card style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.profileAvatar}>
                <Text style={styles.avatarInitials}>
                  {applicant.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.applicantName}>{applicant.name}</Text>
                <Text style={styles.appliedDate}>Applied {formatDate(application.createdAt)}</Text>
              </View>
              <StatusBadge status={application.status} />
            </View>

            <View style={styles.divider} />

            <InfoRow icon="mail" label="Email Address" value={applicant.email} />
            {applicant.phone ? (
              <InfoRow icon="phone" label="Phone Number" value={applicant.phone} />
            ) : null}
            {applicant.location ? (
              <InfoRow icon="map-pin" label="Location" value={applicant.location} />
            ) : null}
          </Card>
        ) : null}

        {/* Submitted Application Information */}
        <Card style={styles.card}>
          <SectionHeader title="Application Details" />

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
            <InfoRow label="Message from Applicant" value={application.shortMessage} />
          ) : null}

          {application.coverLetter ? (
            <InfoRow label="Cover Letter" value={application.coverLetter} />
          ) : null}

          {application.cvUrl ? (
            <InfoRow
              icon="file-text"
              label="CV / Resume"
              value="Open Applicant CV"
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

        {/* Business Hiring Action Hierarchy */}
        {application.status === "PENDING" || application.status === "SHORTLISTED" ? (
          <Card style={styles.actionsCard}>
            <SectionHeader title="Hiring Decision" subtitle="Choose an action for this candidate" />

            {/* Primary Action: Hire */}
            <Button
              title="Hire Applicant"
              icon="check-circle"
              variant="primary"
              onPress={handleHire}
              disabled={busy || capacityFull}
              loading={actionInFlight === "hire"}
              size="lg"
              style={{ marginBottom: spacing.sm }}
            />

            {capacityFull ? (
              <View style={styles.capacityNotice}>
                <Feather name="alert-circle" size={14} color={colors.warningText} />
                <Text style={styles.capacityMessage}>
                  All available positions have been filled.
                </Text>
              </View>
            ) : null}

            {/* Secondary Action: Shortlist */}
            {application.status === "PENDING" ? (
              <Button
                title="Shortlist Candidate"
                icon="star"
                variant="secondary"
                onPress={handleShortlist}
                disabled={busy}
                loading={actionInFlight === "shortlist"}
                style={{ marginBottom: spacing.sm }}
              />
            ) : null}

            {/* Destructive Action: Reject */}
            <Button
              title="Reject Application"
              icon="x-circle"
              variant="danger"
              onPress={() => setRejectModalVisible(true)}
              disabled={busy}
              loading={actionInFlight === "reject"}
            />
          </Card>
        ) : application.status === "HIRED" ? (
          <Card style={styles.actionsCard}>
            <SectionHeader title="Work Status" subtitle="Mark when candidate completes work" />
            <Button
              title="Mark Work Completed"
              icon="award"
              variant="primary"
              onPress={handleComplete}
              disabled={busy}
              loading={actionInFlight === "complete"}
              size="lg"
            />
          </Card>
        ) : application.status === "COMPLETED" && applicant ? (
          <Card style={styles.actionsCard}>
            <SectionHeader title="Worker Review" subtitle="Leave feedback for this worker" />
            <Button
              title="Leave a Review for Worker"
              icon="star"
              variant="primary"
              onPress={() =>
                (navigation as any).navigate("ReviewForm", {
                  gigId: application.gig.id,
                  revieweeId: applicant.id,
                  revieweeName: applicant.name,
                })
              }
              size="lg"
            />
          </Card>
        ) : null}

        {/* Rejection Reason Modal */}
        <RejectionModal
          visible={rejectModalVisible}
          title="Reject Application"
          subtitle="Please provide a constructive reason for this rejection."
          placeholder="e.g., Looking for more experience in commercial cleaning..."
          submitLabel="Confirm Rejection"
          onCancel={() => setRejectModalVisible(false)}
          onSubmit={handleRejectSubmit}
          submitting={actionInFlight === "reject"}
        />

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
  profileCard: {
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
  },
  avatarInitials: {
    color: colors.primaryDark,
    fontSize: typography.sizes.base,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  appliedDate: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  actionsCard: {
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  capacityNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  capacityMessage: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.warningText,
    textAlign: "center",
  },
});
