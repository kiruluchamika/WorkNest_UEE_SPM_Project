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
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import type { ApplicationDetail } from "../../types";

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

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
    Alert.alert("Withdraw application?", "Are you sure you want to withdraw this application?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: async () => {
          if (!applicationId) return;
          setWithdrawing(true);
          try {
            await applicationsApi.withdrawApplication(applicationId);
            Alert.alert("Application withdrawn successfully.");
            await load();
          } catch (err) {
            Alert.alert("Could not withdraw", err instanceof Error ? err.message : "Please try again.");
          } finally {
            setWithdrawing(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading application..." fullScreen />
      </SafeAreaView>
    );
  }

  if (loadError || !application) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Feather name="alert-triangle" size={22} color={colors.danger} />
          </View>
          <Text style={styles.centerTitle}>Can&apos;t open this application</Text>
          <Text style={styles.centerText}>{loadError ?? "Something went wrong."}</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const schedule = [formatDate(application.gig.startDate), application.gig.endDate ? `- ${formatDate(application.gig.endDate)}` : null]
    .filter(Boolean)
    .join(" ");
  const canWithdraw = application.status === "PENDING" || application.status === "SHORTLISTED";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Application Details</Text>
          <View style={{ width: 32 }} />
        </View>

        <Card style={styles.gigCard}>
          <View style={styles.gigHeader}>
            <Text style={styles.gigTitle}>{application.gig.title}</Text>
            <ApplicationStatusBadge status={application.status} />
          </View>
          <Text style={styles.gigMeta}>{application.gig.category?.name ?? "Uncategorized"}</Text>
          <Text style={styles.gigMeta}>{application.gig.location}</Text>
          <Text style={styles.gigMeta}>{schedule}</Text>
          <Text style={styles.gigPayment}>
            {formatCurrency(application.gig.paymentAmount)} / {paymentTypeLabel(application.gig.paymentType)}
          </Text>
          <Text style={styles.appliedDate}>Applied: {formatDate(application.createdAt)}</Text>
        </Card>

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

        {canWithdraw ? (
          <Button
            title="Withdraw Application"
            variant="danger"
            onPress={handleWithdraw}
            disabled={withdrawing}
            loading={withdrawing}
            style={{ marginTop: spacing.md }}
          />
        ) : application.status === "COMPLETED" && application.gig.business ? (
          <Button
            title="Leave a Review"
            onPress={() =>
              (navigation as any).navigate("ReviewForm", {
                gigId: application.gig.id,
                revieweeId: application.gig.business!.id,
                revieweeName: application.gig.business!.name,
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
  gigCard: {
    marginBottom: spacing.md,
  },
  gigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  gigTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  gigMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  gigPayment: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  appliedDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
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
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  centerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  centerText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
});
