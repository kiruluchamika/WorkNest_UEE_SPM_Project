import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import * as gigPostApi from "../../api/gigPostApi";
import * as applicationsApi from "../../api/applicationsApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorState } from "../../components/common/ErrorState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { InfoRow } from "../../components/common/InfoRow";
import { SectionHeader } from "../../components/common/SectionHeader";
import { EmployerSection } from "../../components/gig/EmployerSection";
import { GigLocationMapCard } from "../../components/map/GigLocationMapCard";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import type { GigPost, JobApplicationStatus } from "../../types";
import type { JobSeekerStackParamList } from "../../navigation/JobSeekerTabs";

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

export const GigDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<JobSeekerStackParamList>>();
  const route = useRoute();
  const { gigId } = (route.params as { gigId: string }) || {};
  const { user } = useAuth();

  const [gig, setGig] = useState<GigPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<JobApplicationStatus | null>(null);

  const loadGig = useCallback(async () => {
    if (!gigId) {
      setLoadError("This gig could not be identified.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await gigPostApi.getPublicGigPost(gigId);
      setGig(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this gig.");
    } finally {
      setLoading(false);
    }
  }, [gigId]);

  const checkApplication = useCallback(async () => {
    if (!user || user.role !== "jobseeker" || !gigId) return;
    try {
      const myApps = await applicationsApi.getMyApplications();
      const match = myApps.find((a) => a.gigId === gigId);
      if (match) {
        setApplied(true);
        setApplicationId(match.id);
        setApplicationStatus(match.status);
      } else {
        setApplied(false);
        setApplicationId(null);
        setApplicationStatus(null);
      }
    } catch {
      // non-critical check
    }
  }, [user, gigId]);

  useFocusEffect(
    useCallback(() => {
      loadGig();
      checkApplication();
    }, [loadGig, checkApplication])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading gig details..." fullScreen />
      </SafeAreaView>
    );
  }

  if (loadError || !gig) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <ErrorState
          title="Gig not found"
          message={loadError ?? "This gig may have expired or been removed."}
          onRetry={loadGig}
          onGoBack={() => navigation.goBack()}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  const schedule = [
    formatDate(gig.startDate),
    gig.endDate ? `- ${formatDate(gig.endDate)}` : null,
    gig.startTime ? `(${gig.startTime}${gig.endTime ? ` - ${gig.endTime}` : ""})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const isJobseeker = user?.role === "jobseeker";
  const remainingWorkers = Math.max(gig.workersNeeded - (gig.filledPositions ?? 0), 0);
  const capacityFull = remainingWorkers === 0;
  const canApply = isJobseeker && gig.status === "ACTIVE" && !applied && !capacityFull;

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
          <Text style={styles.navTitle} numberOfLines={1}>
            Gig Details
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {gig.imageUrl ? (
          <Image source={{ uri: gig.imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : null}

        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {gig.category?.name ?? "General"}
              </Text>
            </View>
            <StatusBadge status={gig.status} />
          </View>

          <Text style={styles.title}>{gig.title}</Text>
          <Text style={styles.businessName}>
            {gig.business?.name ?? "WorkNest Business"}
          </Text>

          {/* Pay Highlight Banner */}
          <View style={styles.payHighlight}>
            <View>
              <Text style={styles.payLabel}>Payment Rate</Text>
              <Text style={styles.payAmount}>{formatCurrency(gig.paymentAmount)}</Text>
            </View>
            <View style={styles.payTypePill}>
              <Text style={styles.payTypeText}>{paymentTypeLabel(gig.paymentType)}</Text>
            </View>
          </View>
        </Card>

        {/* Key Information Summary */}
        <Card style={styles.sectionCard}>
          <SectionHeader title="Gig Information" />
          <InfoRow icon="map-pin" label="Work Location" value={gig.location} />
          <InfoRow icon="calendar" label="Dates & Schedule" value={schedule || "Not specified"} />
          <InfoRow
            icon="users"
            label="Positions & Availability"
            value={`${gig.workersNeeded} workers needed (${remainingWorkers} remaining)`}
            rightElement={
              capacityFull ? (
                <View style={styles.fullBadge}>
                  <Text style={styles.fullBadgeText}>Full</Text>
                </View>
              ) : null
            }
          />
          {gig.contactInfo ? (
            <InfoRow icon="phone" label="Contact Info" value={gig.contactInfo} />
          ) : null}
        </Card>

        {/* Renders nothing for gigs without a map pin */}
        <GigLocationMapCard
          latitude={gig.latitude}
          longitude={gig.longitude}
          locationText={gig.location}
          style={styles.sectionCard}
        />

        {/* About the Gig Description */}
        <Card style={styles.sectionCard}>
          <SectionHeader title="About the Gig" />
          <Text style={styles.description}>{gig.description}</Text>
        </Card>

        {/* Skills & Requirements */}
        <Card style={styles.sectionCard}>
          <SectionHeader title="Requirements & Skills" />
          {gig.requiredSkills.length === 0 ? (
            <Text style={styles.noSkillsText}>
              No specific skills listed. Check description for requirements.
            </Text>
          ) : (
            <View style={styles.skillsWrap}>
              {gig.requiredSkills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Feather name="check" size={12} color={colors.primaryDark} />
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Employer Reputation Section */}
        <EmployerSection
          gig={gig}
          onViewProfile={() => navigation.navigate("EmployerProfile", { gigId: gig.id })}
        />

        {/* Application CTA Status Banner */}
        {canApply ? (
          <View style={styles.ctaContainer}>
            <Button
              title="Apply for this Gig"
              icon="send"
              onPress={() => navigation.navigate("ApplyToGig", { gigId: gig.id })}
              size="lg"
            />
          </View>
        ) : isJobseeker && applied ? (
          <Card style={styles.appliedCard} variant="highlight">
            <View style={styles.appliedIconWrap}>
              <Feather name="check-circle" size={24} color={colors.successText} />
            </View>
            <Text style={styles.appliedTitle}>Application Submitted</Text>
            <View style={styles.statusBadgeRow}>
              <Text style={styles.appliedSubtext}>Current Status: </Text>
              <StatusBadge status={applicationStatus ?? "PENDING"} size="sm" />
            </View>
            {applicationId ? (
              <Button
                title="View My Application"
                variant="outline"
                size="sm"
                onPress={() =>
                  (navigation as any).getParent()?.navigate("MyApplicationsTab", {
                    screen: "ApplicationDetails",
                    params: { applicationId },
                  })
                }
                style={{ marginTop: spacing.md }}
              />
            ) : null}
          </Card>
        ) : isJobseeker ? (
          <Card style={styles.blockedCard} variant="warning">
            <View style={styles.warningIconWrap}>
              <Feather name="lock" size={22} color={colors.warningText} />
            </View>
            <Text style={styles.blockedTitle}>
              {capacityFull
                ? "Positions Filled"
                : "Not Accepting Applications"}
            </Text>
            <Text style={styles.blockedText}>
              {capacityFull
                ? "All available positions have been filled."
                : `This gig is currently ${gig.status.toLowerCase().replace(/_/g, " ")}.`}
            </Text>
          </Card>
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
  heroImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSubtle,
  },
  heroCard: {
    marginBottom: spacing.md,
  },
  heroTopRow: {
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
    lineHeight: 28,
  },
  businessName: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  payHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  payLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  payAmount: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.primaryDark,
    marginTop: 2,
  },
  payTypePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payTypeText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  fullBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  fullBadgeText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
    color: colors.warningText,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  noSkillsText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  skillText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  ctaContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  appliedCard: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  appliedIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  appliedTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  appliedSubtext: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  blockedCard: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  warningIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.warningLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  blockedTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.xs,
  },
  blockedText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
