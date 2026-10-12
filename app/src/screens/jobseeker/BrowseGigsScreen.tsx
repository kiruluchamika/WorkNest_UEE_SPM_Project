import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import * as gigPostApi from "../../api/gigPostApi";
import { GigCard } from "../../components/gig/GigCard";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { GigPost } from "../../types";
import type { JobSeekerStackParamList } from "../../navigation/JobSeekerTabs";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function categoryIcon(name: string): keyof typeof Feather.glyphMap {
  if (/clean/i.test(name)) return "wind";
  if (/event/i.test(name)) return "calendar";
  if (/deliver/i.test(name)) return "truck";
  if (/office/i.test(name)) return "briefcase";
  if (/tech|develop/i.test(name)) return "code";
  if (/photo|video/i.test(name)) return "camera";
  return "grid";
}

export const BrowseGigsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<JobSeekerStackParamList>>();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const [gigs, setGigs] = useState<GigPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [payment, setPayment] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  const request = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++request.current;
    try {
      const data = await gigPostApi.listActiveGigPosts();
      if (id === request.current) {
        setGigs(data);
        setError(null);
      }
    } catch (e) {
      if (id === request.current) {
        setError(e instanceof Error ? e.message : "Could not load gigs.");
      }
    } finally {
      if (id === request.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      void refresh();
      const timer = setInterval(() => setNow(new Date()), 60000);
      return () => {
        clearInterval(timer);
        request.current++;
      };
    }, [refresh])
  );

  const categories = Array.from(
    new Map(gigs.filter((g) => g.category).map((g) => [g.categoryId, g.category!.name]))
  );

  const needle = query.trim().toLowerCase();
  const filtered = gigs.filter(
    (g) =>
      g.status === "ACTIVE" &&
      (category === "all" || g.categoryId === category) &&
      (payment === "all" || g.paymentType === payment) &&
      (!needle ||
        [g.title, g.location, g.business?.name, g.category?.name, ...g.requiredSkills]
          .join(" ")
          .toLowerCase()
          .includes(needle))
  );

  const reset = () => {
    setQuery("");
    setCategory("all");
    setPayment("all");
  };

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void refresh();
            }}
            tintColor={colors.primaryDark}
          />
        }
        renderItem={({ item }) => (
          <GigCard
            gig={item}
            onPress={(g) => navigation.navigate("GigDetail", { gigId: g.id })}
          />
        )}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Top Bar: Greeting & Quick Profile/Notification Actions */}
            <View style={styles.header}>
              <View style={styles.greeting}>
                <Text style={styles.eyebrow}>{greeting}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {firstName}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Notifications, ${unreadCount} unread`}
                  style={styles.iconButton}
                  onPress={() => navigation.getParent()?.navigate("Notifications")}
                  activeOpacity={0.8}
                >
                  <Feather name="bell" size={20} color={colors.textSecondary} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Open your profile"
                  style={styles.avatar}
                  onPress={() => navigation.getParent()?.navigate("Profile")}
                  activeOpacity={0.8}
                >
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user?.name?.charAt(0).toUpperCase() || "W"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Date & Location Pill Row */}
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>
                {now.toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </Text>
              <View style={styles.locationPill}>
                <Feather name="map-pin" size={11} color={colors.primaryDark} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {user?.location || "Sri Lanka"}
                </Text>
              </View>
            </View>

            {/* Hero Section */}
            <View style={styles.intro}>
              <Text style={styles.title}>Find gig work near you</Text>
              <Text style={styles.subtitle}>
                Flexible hourly and daily gigs with verified businesses.
              </Text>
            </View>

            {/* Search and Filters Bar */}
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Feather name="search" size={18} color={colors.primaryDark} />
                <TextInput
                  accessibilityLabel="Search gigs by title, skill, or area"
                  placeholder="Search by title, skills, location..."
                  placeholderTextColor={colors.textPlaceholder}
                  value={query}
                  onChangeText={setQuery}
                  style={styles.input}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {query.length > 0 ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    style={styles.clearIcon}
                    onPress={() => setQuery("")}
                    hitSlop={8}
                  >
                    <Feather name="x" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Toggle payment filters"
                accessibilityState={{ expanded: filtersOpen }}
                style={[styles.filterButton, payment !== "all" && styles.filterButtonActive]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setFiltersOpen(!filtersOpen);
                }}
                activeOpacity={0.8}
              >
                <Feather
                  name="sliders"
                  size={18}
                  color={payment !== "all" ? colors.textInverse : colors.primaryDark}
                />
              </TouchableOpacity>
            </View>

            {/* Expanded Payment Filter Panel */}
            {filtersOpen && (
              <View style={styles.filterPanel}>
                <View style={styles.filterPanelHeader}>
                  <Text style={styles.filterPanelTitle}>Filter by Payment Type</Text>
                  {payment !== "all" ? (
                    <TouchableOpacity onPress={() => setPayment("all")}>
                      <Text style={styles.resetLink}>Reset</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.filterChipsRow}>
                  {["all", "HOURLY", "DAILY", "FIXED"].map((value) => {
                    const isSelected = payment === value;
                    const label =
                      value === "all"
                        ? "Any payment"
                        : value === "HOURLY"
                        ? "Hourly rate"
                        : value === "DAILY"
                        ? "Daily rate"
                        : "Fixed pay";
                    return (
                      <TouchableOpacity
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => setPayment(value)}
                        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Categories Horizontal Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {[["all", "All Gigs"], ...categories].map(([id, name]) => {
                const isSelected = category === id;
                return (
                  <TouchableOpacity
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setCategory(id);
                    }}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    activeOpacity={0.75}
                  >
                    <Feather
                      name={categoryIcon(name)}
                      size={14}
                      color={isSelected ? colors.textInverse : colors.primaryDark}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Results Count & Active Filter Reset */}
            <View style={styles.resultsRow}>
              <View style={styles.resultsCountWrap}>
                <Text style={styles.resultsTitle}>Available Gigs</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{filtered.length}</Text>
                </View>
              </View>
              {(query || category !== "all" || payment !== "all") && (
                <TouchableOpacity onPress={reset} style={styles.clearAllFilters}>
                  <Feather name="rotate-ccw" size={12} color={colors.primaryDark} />
                  <Text style={styles.clearFiltersText}>Reset filters</Text>
                </TouchableOpacity>
              )}
            </View>

            {error && (
              <ErrorState
                title="Couldn't refresh gigs"
                message={error}
                onRetry={refresh}
                style={{ marginBottom: spacing.md }}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <LoadingSpinner message="Finding opportunities near you..." />
          ) : (
            <EmptyState
              icon="search"
              title="No gigs found"
              description="Try searching with different keywords or clearing active filters."
              actionTitle="Clear all filters"
              onAction={reset}
            />
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  headerContainer: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  greeting: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: "600",
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    borderRadius: radius.full,
    backgroundColor: colors.danger,
    paddingHorizontal: 4,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.sm,
    fontWeight: "800",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: "500",
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  locationText: {
    color: colors.primaryDark,
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
  },
  intro: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    ...shadows.subtle,
  },
  input: {
    flex: 1,
    marginLeft: spacing.xs + 2,
    fontSize: typography.sizes.sm,
    color: colors.text,
    paddingVertical: 8,
  },
  clearIcon: {
    padding: 4,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.subtle,
  },
  filterPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  filterPanelTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  resetLink: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  filterChipSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  filterChipTextSelected: {
    color: colors.textInverse,
    fontWeight: "700",
  },
  categoryScroll: {
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  categoryChipSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  categoryChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: colors.textInverse,
  },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  resultsCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  countBadgeText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  clearAllFilters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primaryDark,
  },
});
