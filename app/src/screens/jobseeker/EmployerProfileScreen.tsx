import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import type { JobSeekerStackParamList } from "../../navigation/JobSeekerTabs";
import type { GigPost } from "../../types";
import { getPublicGigPost } from "../../api/gigPostApi";
import { EmployerSection } from "../../components/gig/EmployerSection";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorState } from "../../components/common/ErrorState";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export function EmployerProfileScreen({
  route,
  navigation,
}: NativeStackScreenProps<JobSeekerStackParamList, "EmployerProfile">) {
  const [gig, setGig] = useState<GigPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      getPublicGigPost(route.params.gigId)
        .then((g) => {
          if (active) setGig(g);
        })
        .catch((e) => {
          if (active) setError(e instanceof Error ? e.message : "Could not load employer profile.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [route.params.gigId, retry])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to gig details"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={16} color={colors.text} />
          <Text style={styles.backText}>Back to gig</Text>
        </TouchableOpacity>

        {loading ? (
          <LoadingSpinner message="Loading employer profile..." />
        ) : error ? (
          <ErrorState
            title="Couldn't load employer"
            message={error}
            onRetry={() => setRetry((r) => r + 1)}
            onGoBack={() => navigation.goBack()}
          />
        ) : gig ? (
          <EmployerSection gig={gig} full />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: "700",
  },
});
