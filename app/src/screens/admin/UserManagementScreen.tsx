import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import * as adminUserApi from "../../api/adminUserApi";
import { AppHeader } from "../../components/common/AppHeader";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { FilterChips, FilterOption } from "../../components/common/FilterChips";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatDate } from "../../utils/formatters";
import type { AdminUserStackParamList } from "../../navigation/AdminStack";
import type { AdminUserList, AdminUserSummary, UserRole, UserRoleFilter, UserStatusFilter } from "../../types";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

export const ROLE_LABELS: Record<UserRole, string> = {
  jobseeker: "Job seeker",
  shopowner: "Shop owner",
  verifier: "Verifier",
  admin: "Admin",
};

const ROLE_OPTIONS: FilterOption<UserRoleFilter>[] = [
  { value: "all", label: "All roles", icon: "users" },
  { value: "jobseeker", label: "Job seekers", icon: "user" },
  { value: "shopowner", label: "Shop owners", icon: "shopping-bag" },
  { value: "verifier", label: "Verifiers", icon: "shield" },
  { value: "admin", label: "Admins", icon: "key" },
];

export const UserAvatar: React.FC<{ user: Pick<AdminUserSummary, "name" | "avatarUrl" | "isDisabled">; size?: number }> = ({
  user,
  size = 44,
}) => {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (user.avatarUrl) {
    return <Image source={{ uri: user.avatarUrl }} style={[style, user.isDisabled && styles.avatarDisabled]} />;
  }
  return (
    <View style={[styles.avatar, style, user.isDisabled && styles.avatarDisabled]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{user.name.trim().charAt(0).toUpperCase() || "?"}</Text>
    </View>
  );
};

export const UserManagementScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AdminUserStackParamList, "UserManagement">>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<UserRoleFilter>("all");
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const [result, setResult] = useState<AdminUserList | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ignores responses from searches the admin has already typed past.
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setError(null);
    try {
      const data = await adminUserApi.listUsers({ search: debouncedSearch, role, status, page: 1, limit: PAGE_SIZE });
      if (id !== requestId.current) return;
      setResult(data);
      setUsers(data.users);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [debouncedSearch, role, status]);

  // Reload whenever the screen regains focus so a disable/enable made on the
  // detail screen is reflected when the admin comes back.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!result || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const next = await adminUserApi.listUsers({
        search: debouncedSearch,
        role,
        status,
        page: Math.floor(users.length / PAGE_SIZE) + 1,
        limit: PAGE_SIZE,
      });
      setUsers((current) => [...current, ...next.users.filter((u) => !current.some((c) => c.id === u.id))]);
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more users.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const statusOptions: FilterOption<UserStatusFilter>[] = [
    { value: "all", label: "All", count: result?.counts.all },
    { value: "active", label: "Active", count: result?.counts.active, icon: "check-circle" },
    { value: "disabled", label: "Disabled", count: result?.counts.disabled, icon: "slash" },
  ];

  const hasFilters = debouncedSearch.trim() !== "" || role !== "all" || status !== "all";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader
        subtitle="User management"
        onBellPress={() => navigation.getParent()?.navigate("NotificationsTab" as never)}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>People</Text>
            <Text style={styles.title}>Manage WorkNest accounts</Text>
            <Text style={styles.heroText}>Find anyone on the platform, review their activity and disable accounts that break the rules.</Text>
          </View>
          <View style={styles.heroIcon}>
            <Feather name="users" size={18} color={colors.primaryDark} />
          </View>
        </View>

        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email or phone"
          icon="search"
          rightIcon={search ? "x" : undefined}
          onRightIconPress={() => setSearch("")}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search users"
        />

        <FilterChips options={ROLE_OPTIONS} selected={role} onSelect={setRole} />
        <FilterChips options={statusOptions} selected={status} onSelect={setStatus} style={{ marginBottom: spacing.sm }} />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{status === "disabled" ? "Disabled accounts" : "Accounts"}</Text>
          {result ? <Text style={styles.count}>{result.total}</Text> : null}
        </View>

        {isLoading && !result ? (
          <LoadingSpinner message="Loading users..." />
        ) : error && users.length === 0 ? (
          <ErrorState message={error} onRetry={load} />
        ) : users.length === 0 ? (
          <EmptyState
            icon="user-x"
            title={hasFilters ? "No matching users" : "No users yet"}
            description={hasFilters ? "Try a different name, role or status." : "Accounts will appear here as people sign up."}
            compact
          />
        ) : (
          <>
            {users.map((user) => (
              <Card
                key={user.id}
                style={StyleSheet.flatten([styles.userCard, user.isDisabled && styles.userCardDisabled])}
                onPress={() => navigation.navigate("UserDetail", { userId: user.id })}
                accessibilityLabel={`${user.name}, ${ROLE_LABELS[user.role]}, ${user.isDisabled ? "disabled" : "active"}`}
              >
                <View style={styles.userRow}>
                  <UserAvatar user={user} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                    <View style={styles.badgeRow}>
                      <TrustBadge label={ROLE_LABELS[user.role]} variant="primary" />
                      <TrustBadge label={user.isDisabled ? "Disabled" : "Active"} variant={user.isDisabled ? "danger" : "success"} />
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
                </View>
                {user.isDisabled && user.disabledReason ? (
                  <Text style={styles.disabledReason} numberOfLines={2}>
                    <Text style={{ fontWeight: "700" }}>Reason: </Text>
                    {user.disabledReason}
                  </Text>
                ) : (
                  <Text style={styles.joined}>Joined {formatDate(user.createdAt)}</Text>
                )}
              </Card>
            ))}
            {result && users.length < result.total ? (
              <Button
                title={`Load more (${result.total - users.length} left)`}
                variant="outline"
                onPress={loadMore}
                loading={isLoadingMore}
                style={{ marginTop: spacing.xs }}
              />
            ) : null}
          </>
        )}

        <View style={{ height: spacing.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: spacing.md },
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
  eyebrow: { fontSize: typography.sizes.sm, fontWeight: "800", color: colors.primaryDark, marginBottom: spacing.xs },
  title: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.text },
  heroText: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 17 },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginLeft: spacing.sm,
  },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.text },
  count: { fontSize: typography.sizes.xs, color: colors.textMuted, fontWeight: "700" },
  userCard: { marginBottom: spacing.sm, padding: spacing.md },
  userCardDisabled: { borderWidth: 1, borderColor: colors.dangerBorder },
  userRow: { flexDirection: "row", alignItems: "center" },
  userInfo: { flex: 1, marginLeft: spacing.sm, marginRight: spacing.xs },
  userName: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.text },
  userEmail: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: 1 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  avatar: { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarDisabled: { opacity: 0.5 },
  avatarText: { fontWeight: "800", color: colors.primaryDark },
  joined: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: spacing.sm },
  disabledReason: {
    fontSize: typography.sizes.xs,
    color: colors.dangerText,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
});
