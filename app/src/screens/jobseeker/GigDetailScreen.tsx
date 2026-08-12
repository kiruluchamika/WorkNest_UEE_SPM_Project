import React, { useState } from "react";
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

import { useAuth } from "../../context/AuthContext";
import { useGigs } from "../../context/GigContext";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import type { Gig } from "../../types";

export const GigDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { gigs } = useGigs();
  const { gigId } = route.params as { gigId: string };
  const [applied, setApplied] = useState(false);

  const gig = gigs.find((g) => g.id === gigId);

  if (!gig) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading gig..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>

        <Card style={styles.heroCard}>
          <View style={styles.header}>
            <Text style={styles.category}>{gig.category.toUpperCase()}</Text>
            <TrustBadge label={gig.status} variant={gig.status === "open" ? "success" : "muted"} />
          </View>
          <Text style={styles.title}>{gig.title}</Text>
          <Text style={styles.shop}>{gig.shopOwnerName}</Text>
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
            <Text style={styles.metaText}>Starts {formatDate(gig.startDate)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="dollar-sign" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {formatCurrency(gig.wage)} / {gig.wageType}
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

        {user?.role === "jobseeker" && gig.status === "open" && !applied ? (
          <Button
            title="Apply now"
            onPress={() =>
              (navigation as any).navigate("ApplyGig", { gigId: gig.id })
            }
            size="lg"
            style={{ marginTop: spacing.md }}
          />


        ) : applied ? (
          <View style={styles.appliedBanner}>
            <Text style={styles.appliedText}>Application sent!</Text>
          </View>
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
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  appliedText: {
    color: colors.success,
    fontWeight: "700",
  },
});
