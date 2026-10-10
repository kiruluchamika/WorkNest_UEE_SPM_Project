import { toast } from "../../utils/toast";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
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
import { ErrorState } from "../../components/common/ErrorState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { SectionHeader } from "../../components/common/SectionHeader";
import { YesNoToggle } from "../../components/applications/YesNoToggle";
import { CustomQuestionField } from "../../components/applications/CustomQuestionField";
import { colors, shadows } from "../../theme/colors";
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

      if (user?.role === "jobseeker") {
        try {
          const myApps = await applicationsApi.getMyApplications();
          const match = myApps.find((a) => a.gigId === gigId);
          if (match) {
            setAlreadyApplied(true);
            setExistingStatus(match.status);
          }
        } catch {
          // non-critical
        }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load application form.");
    } finally {
      setLoading(false);
    }
  }, [gigId, user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const requirements = settings?.requirements ?? getDefaultRequirements("STANDARD");
  const customQuestions: ApplicationQuestion[] = settings?.customQuestions ?? [];
  const mode = settings?.applicationMode ?? "STANDARD";

  const updateField = <K extends keyof ApplicationFormValues>(
    field: K,
    val: ApplicationFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const updateAnswer = (questionId: string, answer: string | boolean) => {
    setValues((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }));
    const key = `question_${questionId}`;
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (!gigId) return;

    const validationErrors = validateApplicationForm(requirements, customQuestions, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error(
        "Missing or Invalid Fields",
        "Please check the highlighted fields and correct any issues before submitting."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildApplicationPayload(gigId, customQuestions, values);
      await applicationsApi.submitApplication(payload);
      toast.success(
        "Application Submitted!",
        "Your application has been sent to the employer. You can track its status in My Applications."
      );
      (navigation as any).getParent()?.navigate("MyApplicationsTab", {
        screen: "MyApplications",
      });
    } catch (err) {
      toast.error(
        "Could not submit application",
        err instanceof Error ? err.message : "Please check your information and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Preparing application form..." fullScreen />
      </SafeAreaView>
    );
  }

  if (loadError || !gig) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <ErrorState
          title="Can't open application"
          message={loadError ?? "Something went wrong."}
          onRetry={loadAll}
          onGoBack={() => navigation.goBack()}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  const remainingWorkers = Math.max(gig.workersNeeded - (gig.filledPositions ?? 0), 0);
  const capacityFull = remainingWorkers === 0;
  const isBlocked = !isJobseeker || gig.status !== "ACTIVE" || capacityFull || alreadyApplied;

  const schedule = [
    formatDate(gig.startDate),
    gig.endDate ? `- ${formatDate(gig.endDate)}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const hasFormFields =
    requirements.requireExperience ||
    requirements.requireAvailability ||
    requirements.requireTransportation ||
    requirements.requireExpectedSalary ||
    requirements.requireShortMessage ||
    requirements.requireCoverLetter ||
    requirements.requireCV ||
    requirements.requirePortfolio ||
    customQuestions.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Navigation Header */}
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
            <Text style={styles.navTitle}>Apply to Gig</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Gig Summary Card */}
          <Card style={styles.gigSummaryCard}>
            <View style={styles.gigTopRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{gig.category?.name ?? "General"}</Text>
              </View>
              <Text style={styles.paymentText}>
                {formatCurrency(gig.paymentAmount)} / {paymentTypeLabel(gig.paymentType)}
              </Text>
            </View>
            <Text style={styles.gigTitle}>{gig.title}</Text>
            <Text style={styles.businessName}>{gig.business?.name ?? "WorkNest Business"}</Text>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{gig.location}</Text>
              {schedule ? (
                <>
                  <Text style={styles.dot}>•</Text>
                  <Feather name="calendar" size={13} color={colors.textMuted} />
                  <Text style={styles.metaText}>{schedule}</Text>
                </>
              ) : null}
            </View>
          </Card>

          {/* Blocked / Already Applied States */}
          {alreadyApplied ? (
            <Card style={styles.blockedCard} variant="highlight">
              <Feather name="check-circle" size={32} color={colors.successText} />
              <Text style={styles.blockedTitle}>You Already Applied</Text>
              <Text style={styles.blockedText}>
                You submitted an application for this gig. You can check your application details and status below.
              </Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Current Status: </Text>
                <StatusBadge status={existingStatus ?? "PENDING"} size="sm" />
              </View>
              <Button
                title="View My Applications"
                variant="primary"
                onPress={() =>
                  (navigation as any).getParent()?.navigate("MyApplicationsTab", {
                    screen: "MyApplications",
                  })
                }
                style={{ marginTop: spacing.md }}
              />
            </Card>
          ) : capacityFull ? (
            <Card style={styles.blockedCard} variant="warning">
              <Feather name="lock" size={32} color={colors.warningText} />
              <Text style={styles.blockedTitle}>All Positions Filled</Text>
              <Text style={styles.blockedText}>
                All available positions have been filled for this gig. Please browse other active opportunities.
              </Text>
              <Button
                title="Browse Other Gigs"
                variant="outline"
                onPress={() => navigation.goBack()}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          ) : !isJobseeker ? (
            <Card style={styles.blockedCard} variant="warning">
              <Feather name="alert-triangle" size={32} color={colors.warningText} />
              <Text style={styles.blockedTitle}>Jobseeker Account Required</Text>
              <Text style={styles.blockedText}>
                You are currently signed in with a business or administrative account. Switch to a jobseeker account to apply for gigs.
              </Text>
            </Card>
          ) : (
            <>
              {/* Mode Info Pill */}
              <View style={styles.modeBadge}>
                <Feather name="layers" size={14} color={colors.primaryDark} />
                <Text style={styles.modeBadgeText}>
                  {modeLabel(mode)} Application
                </Text>
              </View>

              {/* Form Content */}
              {!hasFormFields ? (
                <Card style={styles.card}>
                  <Text style={styles.quickApplyNote}>
                    This gig uses one-tap Quick Apply. No additional answers or attachments are required. Tap below to send your profile.
                  </Text>
                </Card>
              ) : null}

              {/* Experience & Availability Section */}
              {(requirements.requireExperience ||
                requirements.requireAvailability ||
                requirements.requireTransportation ||
                requirements.requireExpectedSalary) && (
                <Card style={styles.card}>
                  <SectionHeader title="Experience & Availability" />

                  {requirements.requireExperience ? (
                    <Input
                      label="Previous Experience"
                      required
                      value={values.experience}
                      onChangeText={(v) => updateField("experience", v)}
                      placeholder="Briefly describe any relevant work experience or skills..."
                      multiline
                      rows={3}
                      error={errors.experience}
                    />
                  ) : null}

                  {requirements.requireAvailability ? (
                    <Input
                      label="Availability"
                      required
                      value={values.availability}
                      onChangeText={(v) => updateField("availability", v)}
                      placeholder="e.g., Available all days for the specified gig hours"
                      helperText={schedule ? `Gig dates: ${schedule}` : undefined}
                      multiline
                      rows={2}
                      error={errors.availability}
                    />
                  ) : null}

                  {requirements.requireTransportation ? (
                    <View style={styles.toggleFieldWrap}>
                      <Text style={styles.fieldLabel}>
                        Reliable Transportation <Text style={styles.requiredAsterisk}>*</Text>
                      </Text>
                      <YesNoToggle
                        value={values.transportation}
                        onChange={(v) => updateField("transportation", v)}
                        error={errors.transportation}
                      />
                    </View>
                  ) : null}

                  {requirements.requireExpectedSalary ? (
                    <Input
                      label="Expected Pay / Rate (LKR)"
                      required
                      value={values.expectedSalary}
                      onChangeText={(v) => updateField("expectedSalary", v)}
                      placeholder={`e.g., ${gig.paymentAmount}`}
                      keyboardType="numeric"
                      error={errors.expectedSalary}
                    />
                  ) : null}
                </Card>
              )}

              {/* Messages & Cover Letter Section */}
              {(requirements.requireShortMessage || requirements.requireCoverLetter) && (
                <Card style={styles.card}>
                  <SectionHeader title="Messages & Cover Letter" />

                  {requirements.requireShortMessage ? (
                    <Input
                      label="Short Message to Employer"
                      required
                      value={values.shortMessage}
                      onChangeText={(v) => updateField("shortMessage", v)}
                      placeholder="A brief greeting or introduction..."
                      multiline
                      rows={2}
                      error={errors.shortMessage}
                    />
                  ) : null}

                  {requirements.requireCoverLetter ? (
                    <Input
                      label="Cover Letter"
                      required
                      value={values.coverLetter}
                      onChangeText={(v) => updateField("coverLetter", v)}
                      placeholder="Tell the business why you are the best fit for this role..."
                      multiline
                      rows={4}
                      error={errors.coverLetter}
                    />
                  ) : null}
                </Card>
              )}

              {/* CV & Portfolio Section */}
              {(requirements.requireCV || requirements.requirePortfolio) && (
                <Card style={styles.card}>
                  <SectionHeader title="Links & Attachments" />

                  {requirements.requireCV ? (
                    <Input
                      label="CV / Resume Link"
                      required
                      icon="file-text"
                      value={values.cvUrl}
                      onChangeText={(v) => updateField("cvUrl", v)}
                      placeholder="https://drive.google.com/..."
                      autoCapitalize="none"
                      keyboardType="url"
                      error={errors.cvUrl}
                      helperText="Paste a public link to your CV or Resume"
                    />
                  ) : null}

                  {requirements.requirePortfolio ? (
                    <Input
                      label="Portfolio / Website Link"
                      required
                      icon="globe"
                      value={values.portfolioUrl}
                      onChangeText={(v) => updateField("portfolioUrl", v)}
                      placeholder="https://myportfolio.com"
                      autoCapitalize="none"
                      keyboardType="url"
                      error={errors.portfolioUrl}
                    />
                  ) : null}
                </Card>
              )}

              {/* Screening Questions */}
              {customQuestions.length > 0 && (
                <View style={styles.customQuestionsSection}>
                  <SectionHeader
                    title="Screening Questions"
                    subtitle="Please answer each required question from the employer"
                    count={customQuestions.length}
                  />
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
                </View>
              )}

              {/* Submission Button */}
              <View style={styles.submitWrap}>
                <Button
                  title="Submit Application"
                  icon="send"
                  onPress={handleSubmit}
                  disabled={submitting}
                  loading={submitting}
                  size="lg"
                />
              </View>
            </>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  gigSummaryCard: {
    marginBottom: spacing.md,
  },
  gigTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
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
  paymentText: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  gigTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  businessName: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  dot: {
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  modeBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  card: {
    marginBottom: spacing.md,
  },
  toggleFieldWrap: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.xs + 2,
    letterSpacing: 0.2,
  },
  requiredAsterisk: {
    color: colors.danger,
    fontWeight: "700",
  },
  quickApplyNote: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  customQuestionsSection: {
    marginBottom: spacing.sm,
  },
  submitWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  blockedCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  blockedTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  blockedText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  statusLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
});
