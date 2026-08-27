import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import * as gigPostApi from "../../api/gigPostApi";
import * as applicationsApi from "../../api/applicationsApi";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate, gigStatusBadge } from "../../utils/formatters";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import type { GigPost, JobApplicationStatus } from "../../types";

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

export const GigDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { gigId } = route.params as { gigId: string };
  const [gig, setGig] = useState<GigPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<JobApplicationStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [gigData, check] = await Promise.all([
        gigPostApi.getPublicGigPost(gigId),
        user?.role === "jobseeker"
          ? applicationsApi.checkExistingApplication(gigId)
          : Promise.resolve({ applied: false, application: null }),
      ]);
      setGig(gigData);
      setApplied(check.applied);
      setApplicationId(check.application?.id ?? null);
      setApplicationStatus(check.application?.status ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this gig.");
    } finally {
      setLoading(false);
    }
  }, [gigId, user?.role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const schedule = useMemo(() => {
    if (!gig) return "";
    return [
      formatDate(gig.startDate),
      gig.startTime ? gig.startTime : null,
      gig.endDate ? `to ${formatDate(gig.endDate)}` : null,
      gig.endTime ? gig.endTime : null,
    ]
      .filter(Boolean)
      .join(" ");
  }, [gig]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading gig..." />
      </SafeAreaView>
    );
  }

  if (loadError || !gig) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <Feather name="alert-triangle" size={22} color={colors.danger} />
          <Text style={styles.centerTitle}>Can&apos;t load this gig</Text>
          <Text style={styles.centerText}>{loadError ?? "This gig could not be found."}</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const badge = gigStatusBadge(gig.status);
  const isJobseeker = user?.role === "jobseeker";
  const remainingWorkers = Math.max(gig.workersNeeded - (gig.filledPositions ?? 0), 0);
  const capacityFull = remainingWorkers === 0;
  const canApply = isJobseeker && gig.status === "ACTIVE" && !applied && !capacityFull;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>

        <Card style={styles.heroCard}>
          <View style={styles.header}>
            <Text style={styles.category}>{gig.category?.name ?? "Uncategorized"}</Text>
            <TrustBadge label={badge.label} variant={badge.variant} />
          </View>
          <Text style={styles.title}>{gig.title}</Text>
          <Text style={styles.shop}>{gig.business?.name ?? "WorkNest business"}</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About the gig</Text>
          <Text style={styles.description}>{gig.description}</Text>

          <View style={styles.metaRow}>
            <Feather name="map-pin" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>{gig.location}</Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="calendar" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>{schedule || "Schedule not specified"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="dollar-sign" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {formatCurrency(gig.paymentAmount)} / {paymentTypeLabel(gig.paymentType)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="users" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>
              Workers needed: {gig.workersNeeded} | Remaining: {remainingWorkers}
            </Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Skills needed</Text>
          <View style={styles.skills}>
            {gig.requiredSkills.map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </Card>

        {canApply ? (
          <Button
            title="Apply Now"
            onPress={() =>
              (navigation as any).navigate("ApplyToGig", { gigId: gig.id })
            }
            size="lg"
            style={{ marginTop: spacing.md }}
          />
        ) : isJobseeker && applied ? (
          <Card style={styles.appliedCard}>
            <Feather name="check-circle" size={22} color={colors.success} />
            <Text style={styles.appliedText}>Applied</Text>
            <Text style={styles.appliedMeta}>Status: {applicationStatus ?? "PENDING"}</Text>
            {applicationId ? (
              <Button
                title="View My Application"
                variant="outline"
                onPress={() =>
                  (navigation as any).getParent()?.navigate("MyApplicationsTab", {
                    screen: "ApplicationDetails",
                    params: { applicationId },
                  })
                }
                style={{ marginTop: spacing.sm }}
              />
            ) : null}
          </Card>
        ) : isJobseeker ? (
          <Card style={styles.appliedCard}>
            <Feather name="lock" size={20} color={colors.warning} />
            <Text style={styles.appliedText}>Not accepting applications</Text>
            <Text style={styles.appliedMeta}>
              {capacityFull
                ? "All available positions have been filled."
                : `This gig is currently ${badge.label.toLowerCase()}.`}
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
    backgroundColor: colors.background,
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
  scroll: {
    padding: spacing.lg,
  },
  back: {
    marginBottom: spacing.md,
  },
  heroCard: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  category: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  shop: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  metaText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  skills: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  skillChip: {
    backgroundColor: colors.cream,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  skillText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  appliedBanner: {
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  appliedCard: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  appliedText: {
    color: colors.success,
    fontWeight: "700",
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
  },
  appliedMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
});
