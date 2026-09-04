import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import * as applicationsApi from "../../api/applicationsApi";
import * as applicationSettingsApi from "../../api/applicationSettingsApi";
import * as gigPostApi from "../../api/gigPostApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { YesNoToggle } from "../../components/applications/YesNoToggle";
import { CustomQuestionField } from "../../components/applications/CustomQuestionField";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import { APPLICATION_MODE_OPTIONS, getDefaultRequirements } from "../../utils/applicationSettings";
import {
  buildApplicationPayload,
  createEmptyFormValues,
  validateApplicationForm,
  type ApplicationFormValues,
} from "../../utils/applicationValidation";
import type { ApplicationQuestion, ApplicationSettings, GigPost, JobApplicationStatus } from "../../types";

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

function modeLabel(value: string): string {
  return APPLICATION_MODE_OPTIONS.find((m) => m.value === value)?.label ?? value;
}

export const ApplyToGigScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { gigId } = (route.params as { gigId: string }) || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gig, setGig] = useState<GigPost | null>(null);
  const [settings, setSettings] = useState<ApplicationSettings | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [existingStatus, setExistingStatus] = useState<JobApplicationStatus | null>(null);

  const [values, setValues] = useState<ApplicationFormValues>(createEmptyFormValues());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isJobseeker = !user || user.role === "jobseeker";

  const loadAll = useCallback(async () => {
    if (!gigId) {
      setLoadError("This gig could not be identified.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [gigData, settingsData] = await Promise.all([
        gigPostApi.getPublicGigPost(gigId),
        applicationSettingsApi.getPublicApplicationSettings(gigId),
      ]);
      setGig(gigData);
      setSettings(settingsData);

      try {
        const check = await applicationsApi.checkExistingApplication(gigId);
        setAlreadyApplied(check.applied);
        setExistingStatus(check.application?.status ?? null);
      } catch {
        setAlreadyApplied(false);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this gig.");
    } finally {
      setLoading(false);
    }
  }, [gigId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const applicationMode = settings?.applicationMode ?? "STANDARD";
  const requirements = settings?.requirements ?? getDefaultRequirements("STANDARD");
  const customQuestions: ApplicationQuestion[] = settings?.customQuestions ?? [];

  const updateField = <K extends keyof ApplicationFormValues>(key: K, value: ApplicationFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key as string]: "" }));
  };

  const updateAnswer = (questionId: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, answers: { ...prev.answers, [questionId]: value } }));
    const key = `question_${questionId}`;
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async () => {
    if (submitting || !gigId) return;

    const validationErrors = validateApplicationForm(requirements, customQuestions, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert("Check your application", "Please fill in all required fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildApplicationPayload(gigId, customQuestions, values);
      await applicationsApi.submitApplication(payload);
      const goToMyApplications = () => navigation.getParent()?.navigate("MyApplicationsTab" as never);
      if (Platform.OS === "web") {
        // Alert.alert is a no-op on react-native-web, so the confirmation + the
        // navigation nested in its OK button would otherwise silently never happen.
        goToMyApplications();
      } else {
        Alert.alert("Application submitted successfully!", undefined, [{ text: "OK", onPress: goToMyApplications }]);
      }
    } catch (err) {
      Alert.alert("Could not submit", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isJobseeker) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Youth accounts only</Text>
          <Text style={styles.centerText}>Only Youth job seekers can apply for gigs.</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Feather name="alert-triangle" size={22} color={colors.danger} />
          </View>
          <Text style={styles.centerTitle}>Can&apos;t open this gig</Text>
          <Text style={styles.centerText}>{loadError}</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !gig) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading application..." fullScreen />
      </SafeAreaView>
    );
  }

  const schedule = [formatDate(gig.startDate), gig.endDate ? `- ${formatDate(gig.endDate)}` : null]
    .filter(Boolean)
    .join(" ");
  const remainingWorkers = Math.max(gig.workersNeeded - (gig.filledPositions ?? 0), 0);
  const capacityFull = remainingWorkers === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apply for Gig</Text>
          <View style={{ width: 32 }} />
        </View>

        <Card style={styles.gigCard}>
          <Text style={styles.gigTitle}>{gig.title}</Text>
          <Text style={styles.gigMeta}>{gig.category?.name ?? "Uncategorized"}</Text>
          <Text style={styles.gigMeta}>{gig.location}</Text>
          <Text style={styles.gigMeta}>{schedule}</Text>
          <Text style={styles.gigPayment}>
            {formatCurrency(gig.paymentAmount)} / {paymentTypeLabel(gig.paymentType)}
          </Text>
        </Card>

        {gig.status !== "ACTIVE" || capacityFull ? (
          <Card style={styles.blockedCard}>
            <Feather name="lock" size={18} color={colors.warning} />
            <Text style={styles.blockedTitle}>Not accepting applications</Text>
            <Text style={styles.blockedText}>
              {capacityFull
                ? "All available positions have been filled."
                : "This gig is not currently active, so it can't accept new applications."}
            </Text>
          </Card>
        ) : alreadyApplied ? (
          <Card style={styles.appliedCard}>
            <Feather name="check-circle" size={22} color={colors.success} />
            <Text style={styles.appliedTitle}>You have already applied for this gig.</Text>
            <Text style={styles.appliedStatus}>Application Status: {existingStatus ?? "PENDING"}</Text>
            <Button
              title="View My Applications"
              variant="outline"
              onPress={() => navigation.getParent()?.navigate("MyApplicationsTab" as never)}
            />
          </Card>
        ) : (
          <>
            {user ? (
              <Card style={styles.applicantCard}>
                <Text style={styles.sectionTitle}>Applying as</Text>
                <Text style={styles.applicantName}>{user.name}</Text>
                <Text style={styles.applicantMeta}>{user.email}</Text>
                {user.phone ? <Text style={styles.applicantMeta}>{user.phone}</Text> : null}
              </Card>
            ) : null}

            <View style={styles.modeBadge}>
              <Feather name="zap" size={13} color={colors.primaryDark} />
              <Text style={styles.modeBadgeText}>{modeLabel(applicationMode)} application</Text>
            </View>

            <Text style={styles.sectionTitle}>Required Information</Text>

            {requirements.requireExperience ? (
              <Input
                label="Previous Experience *"
                value={values.experience}
                onChangeText={(v) => updateField("experience", v)}
                placeholder="Briefly describe any relevant experience..."
                multiline
                rows={3}
                error={errors.experience}
              />
            ) : null}

            {requirements.requireAvailability ? (
              <View>
                <Input
                  label="Availability *"
                  value={values.availability}
                  onChangeText={(v) => updateField("availability", v)}
                  placeholder="e.g. I am available for the full job period"
                  multiline
                  rows={2}
                  error={errors.availability}
                />
                <Text style={styles.helperText}>Gig runs {schedule || "on the dates above"}.</Text>
              </View>
            ) : null}

            {requirements.requireTransportation ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Reliable Transportation *</Text>
                <YesNoToggle
                  value={values.transportation}
                  onChange={(v) => updateField("transportation", v)}
                  error={errors.transportation}
                />
              </View>
            ) : null}

            {requirements.requireExpectedSalary ? (
              <Input
                label="Expected Pay / Rate *"
                value={values.expectedSalary}
                onChangeText={(v) => updateField("expectedSalary", v)}
                placeholder="e.g. 3500"
                keyboardType="numeric"
                error={errors.expectedSalary}
              />
            ) : null}

            {requirements.requireCV ? (
              <Input
                label="CV / Resume Link *"
                value={values.cvUrl}
                onChangeText={(v) => updateField("cvUrl", v)}
                placeholder="https://..."
                autoCapitalize="none"
                keyboardType="url"
                error={errors.cvUrl}
              />
            ) : null}

            {requirements.requireCoverLetter ? (
              <Input
                label="Cover Letter *"
                value={values.coverLetter}
                onChangeText={(v) => updateField("coverLetter", v)}
                placeholder="Tell the business why you're a good fit..."
                multiline
                rows={4}
                error={errors.coverLetter}
              />
            ) : null}

            {requirements.requirePortfolio ? (
              <Input
                label="Portfolio Link *"
                value={values.portfolioUrl}
                onChangeText={(v) => updateField("portfolioUrl", v)}
                placeholder="https://..."
                autoCapitalize="none"
                keyboardType="url"
                error={errors.portfolioUrl}
              />
            ) : null}

            {requirements.requireShortMessage ? (
              <Input
                label="Short Message *"
                value={values.shortMessage}
                onChangeText={(v) => updateField("shortMessage", v)}
                placeholder="A quick note to the business..."
                multiline
                rows={2}
                error={errors.shortMessage}
              />
            ) : null}

            {customQuestions.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Screening Questions</Text>
                {customQuestions.map((q, index) => (
                  <CustomQuestionField
                    key={q.id ?? index}
                    question={q}
                    index={index}
                    value={q.id ? values.answers[q.id] : undefined}
                    onChange={(v) => q.id && updateAnswer(q.id, v)}
                    error={q.id ? errors[`question_${q.id}`] : undefined}
                  />
                ))}
              </>
            ) : null}

            <View style={{ height: spacing.md }} />

            <Button
              title="Submit Application"
              onPress={handleSubmit}
              disabled={submitting}
              loading={submitting}
            />
          </>
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
  gigTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
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
  applicantCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.cream,
  },
  applicantName: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
  },
  applicantMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  modeBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  fieldBlock: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  blockedCard: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  blockedTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  blockedText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  appliedCard: {
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  appliedTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  appliedStatus: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
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
