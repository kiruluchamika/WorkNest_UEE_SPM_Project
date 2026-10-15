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
import { StatusBadge } from "../../components/common/StatusBadge";
import { AppHeader } from "../../components/common/AppHeader";
import { SectionHeader } from "../../components/common/SectionHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatDate } from "../../utils/formatters";
import type { GigPost } from "../../types";

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
        subtitle="Business Dashboard"
        onProfilePress={() => navigation.navigate("Profile" as never)}
        onBellPress={() => (navigation as any).getParent()?.navigate("Notifications")}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryDark}
          />
        }
      >
        {/* Business Welcome Hero */}
        <View style={styles.hero}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.eyebrow}>
              {user?.name ? `${user.name}'s Shop` : "Business Portal"}
            </Text>
            <Text style={styles.heroTitle}>Manage your gigs and hire verified workers</Text>
          </View>
          <View style={styles.heroIcon}>
            <Feather name="briefcase" size={20} color={colors.primaryDark} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.primarySoft }]}>
              <Feather name="layers" size={16} color={colors.primaryDark} />
            </View>
            <Text style={styles.statValue}>{gigPostStats.total}</Text>
            <Text style={styles.statLabel}>Total Gigs</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.successLight }]}>
              <Feather name="activity" size={16} color={colors.successText} />
            </View>
            <Text style={styles.statValue}>{gigPostStats.active}</Text>
            <Text style={styles.statLabel}>Active Gigs</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.warningLight }]}>
              <Feather name="clock" size={16} color={colors.warningText} />
            </View>
            <Text style={styles.statValue}>{gigPostStats.pending}</Text>
            <Text style={styles.statLabel}>In Review</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.dangerLight }]}>
              <Feather name="x-circle" size={16} color={colors.dangerText} />
            </View>
            <Text style={styles.statValue}>{gigPostStats.rejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </Card>
        </View>

        {/* CTA Button */}
        <Button
          title="+ Post a New Gig"
          icon="plus-circle"
          onPress={() => navigation.navigate("PostGig" as never)}
          size="lg"
          style={{ marginBottom: spacing.md }}
        />

        {/* Active Gigs Section */}
        <SectionHeader
          title="Active Gigs"
          subtitle="Currently published gigs receiving applications"
          count={activeGigPosts.length}
          actionLabel="View All"
          onAction={() => (navigation as any).getParent()?.jumpTo("MyGigsTab")}
        />

        {activeGigPosts.length === 0 ? (
          <EmptyState
            icon="briefcase"
            title="No active gigs right now"
            description="Post a gig to find reliable hourly or daily workers."
            actionTitle="Post Your First Gig"
            onAction={() => navigation.navigate("PostGig" as never)}
          />
        ) : (
          activeGigPosts.slice(0, 4).map((gig: GigPost) => {
            const remaining = Math.max(gig.workersNeeded - (gig.filledPositions ?? 0), 0);
            return (
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
                        <Feather name="briefcase" size={20} color={colors.primaryDark} />
                      </View>
                    )}
                    <View style={styles.gigContent}>
                      <View style={styles.gigHeader}>
                        <Text style={styles.gigTitle} numberOfLines={1}>
                          {gig.title}
                        </Text>
                        <StatusBadge status="ACTIVE" size="sm" />
                      </View>

                      <Text style={styles.gigWage}>
                        {formatCurrency(gig.paymentAmount)} / {gig.paymentType.toLowerCase()}
                      </Text>

                      <View style={styles.manageRow}>
                        <Text style={styles.gigLocation} numberOfLines={1}>
                          {gig.location}
                        </Text>
                        <View style={styles.spotsBadge}>
                          <Text style={styles.spotsText}>
                            {remaining === 0 ? "Full" : `${remaining} spot${remaining === 1 ? "" : "s"}`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
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
  hero: {
    backgroundColor: colors.warmPanel,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 20,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "flex-start",
    padding: spacing.md,
    ...shadows.subtle,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs + 2,
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  gigCard: {
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.subtle,
  },
  gigRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  gigThumb: {
    width: 80,
    minHeight: 88,
    backgroundColor: colors.cream,
  },
  gigThumbPlaceholder: {
    width: 80,
    minHeight: 88,
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
    marginBottom: 4,
    gap: spacing.xs,
  },
  gigTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  gigWage: {
    fontSize: typography.sizes.xs,
    color: colors.successText,
    fontWeight: "700",
  },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  gigLocation: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    flex: 1,
  },
  spotsBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  spotsText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
