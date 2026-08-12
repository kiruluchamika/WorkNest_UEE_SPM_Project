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
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
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
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Applicants</Text>
        <Text style={styles.gigTitle}>{gig?.title || "Gig"}</Text>

        {loading ? (
          <LoadingSpinner message="Loading applicants..." />
        ) : applications.length === 0 ? (
          <Text style={styles.empty}>No applications yet.</Text>
        ) : (
          applications.map((app) => (
            <Card key={app.id} style={styles.appCard}>
              <View style={styles.appHeader}>
                <Text style={styles.appName}>{app.jobSeekerName}</Text>
                <Text
                  style={[
                    styles.status,
                    {
                      color:
                        app.status === "accepted"
                          ? colors.success
                          : app.status === "rejected"
                          ? colors.danger
                          : colors.warning,
                    },
                  ]}
                >
                  {app.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.message}>&ldquo;{app.message}&rdquo;</Text>

              {app.status === "pending" ? (
                <View style={styles.actions}>
                  <Button
                    title="Accept"
                    onPress={() => handleDecision(app.id, "accepted")}
                    size="sm"
                    style={styles.actionButton}
                  />
                  <Button
                    title="Reject"
                    variant="danger"
                    onPress={() => handleDecision(app.id, "rejected")}
                    size="sm"
                    style={styles.actionButton}
                  />
                </View>
              ) : null}
            </Card>
          ))
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
    padding: spacing.lg,
  },
  back: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  empty: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
  appCard: {
    marginBottom: spacing.md,
  },
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
  },
  status: {
    fontSize: typography.sizes.xs,
    fontWeight: "800",
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
    fontStyle: "italic",
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
