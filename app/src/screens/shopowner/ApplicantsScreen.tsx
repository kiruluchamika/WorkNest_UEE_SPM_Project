import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useGigs } from "../../context/GigContext";
import * as applicationApi from "../../api/applicationApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { Application } from "../../types";

export const ApplicantsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { gigId } = route.params as { gigId: string };
  const { gigs } = useGigs();
  const gig = gigs.find((g) => g.id === gigId);

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationApi.listApplicationsByGig(gigId).then((data) => {
      setApplications(data);
      setLoading(false);
    });
  }, [gigId]);

  const handleDecision = async (appId: string, status: "accepted" | "rejected") => {
    await applicationApi.updateApplicationStatus(appId, status);
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status } : a))
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.navTitle}>Applicants</Text>
          <View style={{ width: 36 }} />
        </View>

        {gig ? (
          <Card style={styles.gigSummaryCard}>
            <Text style={styles.gigTitle}>{gig.title}</Text>
            <Text style={styles.gigSubtitle}>Review and manage applicant submissions</Text>
          </Card>
        ) : null}

        {loading ? (
          <LoadingSpinner message="Loading applicants..." />
        ) : applications.length === 0 ? (
          <EmptyState
            icon="users"
            title="No applications yet"
            description="When jobseekers apply to this gig, their submissions will appear here."
          />
        ) : (
          applications.map((app) => {
            const mappedStatus =
              app.status === "accepted" ? "HIRED" : app.status === "rejected" ? "REJECTED" : "PENDING";

            return (
              <Card key={app.id} style={styles.appCard}>
                <View style={styles.appHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {app.jobSeekerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.applicantInfo}>
                    <Text style={styles.appName}>{app.jobSeekerName}</Text>
                  </View>
                  <StatusBadge status={mappedStatus} size="sm" />
                </View>

                {app.message ? (
                  <View style={styles.messageWrap}>
                    <Text style={styles.message}>&ldquo;{app.message}&rdquo;</Text>
                  </View>
                ) : null}

                {app.status === "pending" ? (
                  <View style={styles.actionsRow}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Accept"
                        icon="check"
                        onPress={() => handleDecision(app.id, "accepted")}
                        size="sm"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Reject"
                        icon="x"
                        variant="danger"
                        onPress={() => handleDecision(app.id, "rejected")}
                        size="sm"
                      />
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}

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
  gigSummaryCard: {
    marginBottom: spacing.md,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  gigSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  appCard: {
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xs,
    fontWeight: "800",
  },
  applicantInfo: {
    flex: 1,
  },
  appName: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.text,
  },
  messageWrap: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  message: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    fontStyle: "italic",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
