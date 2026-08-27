import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as applicationsApi from "../../api/applicationsApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ApplicationStatusBadge } from "../../components/applications/ApplicationStatusBadge";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { formatAnswerValue, formatYesNo } from "../../utils/applicationDisplay";
import type { ApplicationDetail } from "../../types";

interface FieldRowProps {
  label: string;
  value: string;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, value }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
);

type ActionKey = "shortlist" | "reject" | "hire" | "complete";

async function openExternalUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    Alert.alert("Can't open link", "This link must start with http:// or https://.");
    return;
  }

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert("Can't open link", "This link could not be opened on this device.");
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
  const [actionInFlight, setActionInFlight] = useState<ActionKey | null>(null);

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

  const runAction = async (key: ActionKey, fn: () => Promise<unknown>) => {
    if (actionInFlight) return;
    setActionInFlight(key);
    try {
      await fn();
      await load();
    } catch (err) {
      Alert.alert("Action failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setActionInFlight(null);
    }
  };

  const handleShortlist = () => {
    if (!applicationId) return;
    runAction("shortlist", () => applicationsApi.shortlistApplication(applicationId));
  };

  const handleReject = () => {
    if (!applicationId) return;
    Alert.alert("Reject applicant?", "This applicant will be marked as rejected.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => runAction("reject", () => applicationsApi.rejectApplication(applicationId)),
      },
    ]);
  };

  const handleHire = () => {
    if (!applicationId) return;
    Alert.alert("Hire this applicant?", "They will be marked as hired for this gig.", [
      { text: "Cancel", style: "cancel" },
      { text: "Hire", onPress: () => runAction("hire", () => applicationsApi.hireApplication(applicationId)) },
    ]);
  };

  const handleComplete = () => {
    if (!applicationId) return;
    Alert.alert("Mark work as completed?", "This confirms the work for this gig is finished.", [
      { text: "Cancel", style: "cancel" },
      { text: "Mark Completed", onPress: () => runAction("complete", () => applicationsApi.completeApplication(applicationId)) },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading applicant..." fullScreen />
      </SafeAreaView>
    );
  }

  if (loadError || !application) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <Feather name="alert-triangle" size={22} color={colors.danger} />
          <Text style={styles.centerTitle}>Can&apos;t open this applicant</Text>
          <Text style={styles.centerText}>{loadError ?? "Something went wrong."}</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applicant Details</Text>
          <View style={{ width: 32 }} />
        </View>

        {applicant ? (
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <Text style={styles.applicantName}>{applicant.name}</Text>
              <ApplicationStatusBadge status={application.status} />
            </View>
            <Text style={styles.applicantMeta}>{applicant.email}</Text>
            {applicant.phone ? <Text style={styles.applicantMeta}>{applicant.phone}</Text> : null}
            {applicant.location ? <Text style={styles.applicantMeta}>{applicant.location}</Text> : null}
          </Card>
        ) : null}

        <Text style={styles.appliedDate}>Applied: {formatDate(application.createdAt)}</Text>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Submitted Application</Text>
          {application.experience ? <FieldRow label="Experience" value={application.experience} /> : null}
          {application.availability ? <FieldRow label="Availability" value={application.availability} /> : null}
          {application.transportation !== undefined ? (
            <FieldRow label="Transportation" value={formatYesNo(application.transportation)} />
          ) : null}
          {application.expectedSalary !== undefined ? (
            <FieldRow label="Expected Pay / Rate" value={formatCurrency(application.expectedSalary)} />
          ) : null}
          {application.shortMessage ? <FieldRow label="Short Message" value={application.shortMessage} /> : null}
          {application.coverLetter ? <FieldRow label="Cover Letter" value={application.coverLetter} /> : null}
          {application.cvUrl ? (
            <TouchableOpacity onPress={() => openExternalUrl(application.cvUrl as string)}>
              <FieldRow label="CV" value="Open CV" />
            </TouchableOpacity>
          ) : null}
          {application.portfolioUrl ? (
            <TouchableOpacity onPress={() => openExternalUrl(application.portfolioUrl as string)}>
              <FieldRow label="Portfolio" value="Open Portfolio" />
            </TouchableOpacity>
          ) : null}
        </Card>

        {application.answers.length > 0 ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Screening Questions</Text>
            {application.answers.map((a, index) => (
              <FieldRow
                key={a.questionId ?? index}
                label={a.question ?? `Question ${index + 1}`}
                value={formatAnswerValue(a.answer)}
              />
            ))}
          </Card>
        ) : null}

        {application.status === "PENDING" || application.status === "SHORTLISTED" ? (
          <View style={styles.actionsBlock}>
            {application.status === "PENDING" ? (
              <Button
                title="Shortlist"
                variant="secondary"
                onPress={handleShortlist}
                disabled={busy}
                loading={actionInFlight === "shortlist"}
                style={{ marginBottom: spacing.sm }}
              />
            ) : null}
            <Button
              title="Hire"
              onPress={handleHire}
              disabled={busy || capacityFull}
              loading={actionInFlight === "hire"}
              style={{ marginBottom: spacing.sm }}
            />
            {capacityFull ? (
              <Text style={styles.capacityMessage}>All available positions have been filled.</Text>
            ) : null}
            <Button
              title="Reject"
              variant="danger"
              onPress={handleReject}
              disabled={busy}
              loading={actionInFlight === "reject"}
            />
          </View>
        ) : application.status === "HIRED" ? (
          <Button
            title="Mark Work Completed"
            onPress={handleComplete}
            disabled={busy}
            loading={actionInFlight === "complete"}
            style={{ marginTop: spacing.md }}
          />
        ) : application.status === "COMPLETED" && applicant ? (
          <Button
            title="Leave a Review"
            onPress={() =>
              (navigation as any).navigate("ReviewForm", {
                gigId: application.gig.id,
                revieweeId: applicant.id,
                revieweeName: applicant.name,
              })
            }
            style={{ marginTop: spacing.md }}
          />
        ) : null}

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
    marginBottom: spacing.md,
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
  profileCard: {
    marginBottom: spacing.xs,
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  applicantName: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  applicantMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  appliedDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  fieldRow: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: "600",
  },
  actionsBlock: {
    marginTop: spacing.sm,
  },
  capacityMessage: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.success,
    textAlign: "center",
    marginBottom: spacing.sm,
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
