import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { useGigPosts } from "../../context/GigPostContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { AppHeader } from "../../components/common/AppHeader";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/formatters";

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { gigPosts, stats: gigPostStats, refresh: refreshGigPosts } = useGigPosts();
  const [refreshing, setRefreshing] = useState(false);

  const activeGigPosts = useMemo(
    () => gigPosts.filter((g) => g.status === "ACTIVE"),
    [gigPosts]
  );

  useFocusEffect(
    useCallback(() => {
      refreshGigPosts();
    }, [refreshGigPosts])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshGigPosts();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader
        subtitle="Shop dashboard"
        onProfilePress={() => navigation.navigate("Profile" as never)}
        onBellPress={() => navigation.getParent()?.navigate("Notifications" as never)}
      />
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

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Gig Post Overview</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).getParent()?.jumpTo("MyGigsTab")}
          >
            <Text style={styles.viewAll}>Manage</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsColumn}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.accentSoft }]}>
                <Feather name="grid" size={16} color={colors.accentDark} />
              </View>
              <Text style={styles.statValue}>{gigPostStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </Card>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.successLight }]}>
                <Feather name="activity" size={16} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{gigPostStats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </Card>
          </View>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#FFF8E1" }]}>
                <Feather name="clock" size={16} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{gigPostStats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </Card>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: colors.dangerLight }]}>
                <Feather name="x-circle" size={16} color={colors.danger} />
              </View>
              <Text style={styles.statValue}>{gigPostStats.rejected}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </Card>
          </View>
        </View>

        <Button
          title="+ Post a New Gig"
          onPress={() => navigation.navigate("PostGig" as never)}
          style={{ marginBottom: spacing.md }}
        />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Active Gigs</Text>
          <TouchableOpacity onPress={() => (navigation as any).getParent()?.jumpTo("MyGigsTab")}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {activeGigPosts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="activity" size={20} color={colors.primaryDark} />
            </View>
            <Text style={styles.emptyTitle}>No active gigs yet</Text>
            <Text style={styles.emptyText}>
              Approved gigs will show up here once an admin reviews them.
            </Text>
          </Card>
        ) : (
          activeGigPosts.slice(0, 4).map((gig) => (
            <TouchableOpacity
              key={gig.id}
              activeOpacity={0.85}
              onPress={() =>
                (navigation as any)
                  .getParent()
                  ?.navigate("MyGigsTab", { screen: "GigDetail", params: { gigId: gig.id } })
              }
            >
              <Card style={styles.gigCard} noPadding>
                <View style={styles.gigRow}>
                  {gig.imageUrl ? (
                    <Image source={{ uri: gig.imageUrl }} style={styles.gigThumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.gigThumbPlaceholder}>
                      <Feather name="image" size={16} color={colors.primaryDark} />
                    </View>
                  )}
                  <View style={styles.gigContent}>
                    <View style={styles.gigHeader}>
                      <Text style={styles.gigTitle} numberOfLines={1}>
                        {gig.title}
                      </Text>
                      <TrustBadge label="Active" variant="success" />
                    </View>
                    <Text style={styles.gigWage}>
                      {formatCurrency(gig.paymentAmount)} / {gig.paymentType.toLowerCase()}
                    </Text>
                    <View style={styles.manageRow}>
                      <Text style={styles.gigApplicants}>{gig.location}</Text>
                      <View style={styles.manageButton}>
                        <Text style={styles.manageText}>View</Text>
                      </View>
                    </View>
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
  statsColumn: {
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    marginRight: spacing.sm,
    alignItems: "flex-start",
    padding: spacing.md,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
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
  emptyCard: {
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  gigCard: {
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  gigRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  gigThumb: {
    width: 72,
    minHeight: 80,
    backgroundColor: colors.cream,
  },
  gigThumbPlaceholder: {
    width: 72,
    minHeight: 80,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  gigContent: {
    flex: 1,
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
