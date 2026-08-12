import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { useGigs } from "../../context/GigContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { AppHeader } from "../../components/common/AppHeader";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/formatters";
import type { Gig } from "../../types";

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { gigs, isLoading, refresh } = useGigs();
  const [refreshing, setRefreshing] = useState(false);
  const myGigs = gigs.filter((g) => g.shopOwnerId === user?.id || g.shopOwnerId === "user-2");

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const stats = {
    total: myGigs.length,
    open: myGigs.filter((g) => g.status === "open").length,
    filled: myGigs.filter((g) => g.status === "filled").length,
    totalApplicants: myGigs.reduce((sum, g) => sum + g.applicantsCount, 0),
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader subtitle="Shop dashboard" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <View>
            <Text style={styles.eyebrow}>Welcome back, {user?.name?.split(" ")[0] || "owner"}</Text>
            <Text style={styles.title}>How's work at your shop today?</Text>
          </View>
          <View style={styles.heroIcon}>
            <Feather name="users" size={18} color={colors.primaryDark} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Feather name="briefcase" size={16} color={colors.primaryDark} />
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Gigs posted</Text>
          </Card>
          <Card style={styles.statCard}>
            <Feather name="activity" size={16} color={colors.success} />
            <Text style={styles.statValue}>{stats.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </Card>
          <Card style={styles.statCard}>
            <Feather name="check-circle" size={16} color={colors.info} />
            <Text style={styles.statValue}>{stats.filled}</Text>
            <Text style={styles.statLabel}>Filled</Text>
          </Card>
          <Card style={styles.statCard}>
            <Feather name="user-plus" size={16} color={colors.warning} />
            <Text style={styles.statValue}>{stats.totalApplicants}</Text>
            <Text style={styles.statLabel}>Applicants</Text>
          </Card>
        </View>

        <Button
          title="+ Post a New Gig"
          onPress={() => navigation.navigate("PostGig" as never)}
          style={{ marginBottom: spacing.md }}
        />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Active Gigs</Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>
        {isLoading && myGigs.length === 0 ? (
          <LoadingSpinner message="Loading your gigs..." />
        ) : myGigs.length === 0 ? (
          <Text style={styles.empty}>No gigs yet. Post your first gig above.</Text>
        ) : (
          myGigs.map((gig) => (
            <TouchableOpacity
              key={gig.id}
              onPress={() =>
                (navigation as any).navigate("Applicants", { gigId: gig.id })
              }
            >


              <Card style={styles.gigCard}>
                <View style={styles.gigHeader}>
                  <Text style={styles.gigTitle}>{gig.title}</Text>
                  <TrustBadge
                    label={gig.status}
                    variant={gig.status === "open" ? "success" : "muted"}
                  />
                </View>
                <Text style={styles.gigWage}>
                  {formatCurrency(gig.wage)} / {gig.wageType}
                </Text>
                <View style={styles.manageRow}>
                  <Text style={styles.gigApplicants}>{gig.applicantsCount} applicants</Text>
                  <View style={styles.manageButton}>
                    <Text style={styles.manageText}>Manage</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
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
    padding: spacing.md,
  },
  hero: {
    backgroundColor: colors.warmPanel,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  eyebrow: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    maxWidth: 220,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    width: "46%",
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: "flex-start",
    padding: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
  },
  viewAll: {
    fontSize: typography.sizes.xs,
    color: colors.primaryDark,
    fontWeight: "700",
  },
  empty: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
  gigCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  gigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  gigWage: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    fontWeight: "600",
  },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  gigApplicants: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  manageButton: {
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  manageText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: "800",
  },
});
