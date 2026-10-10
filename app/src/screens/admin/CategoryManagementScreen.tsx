import { toast } from "../../utils/toast";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useCategories } from "../../context/CategoryContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { TrustBadge } from "../../components/trust/TrustBadge";
import { AppHeader } from "../../components/common/AppHeader";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { Category } from "../../types";

export const CategoryManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { categories, isLoading, refresh, setStatus } = useCategories();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const toggleStatus = (category: Category) => {
    const nextLabel = category.isActive ? "Deactivate" : "Activate";
    Alert.alert(
      `${nextLabel} "${category.name}"?`,
      category.isActive
        ? "It will no longer appear when businesses create new gigs. Existing gigs keep this category."
        : "It will become available again when businesses create new gigs.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextLabel,
          style: category.isActive ? "destructive" : "default",
          onPress: () => setStatus(category.id, !category.isActive).catch(() => {
            toast.error("Something went wrong", "Could not update this category. Try again.");
          }),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader
        subtitle="Category management"
        onBellPress={() => navigation.getParent()?.navigate("NotificationsTab" as never)}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Gig categories</Text>
            <Text style={styles.title}>Keep the gig board organized</Text>
          </View>
          <View style={styles.heroIcon}>
            <Feather name="grid" size={18} color={colors.primaryDark} />
          </View>
        </View>

        <Button
          title="+ Add Category"
          onPress={() => (navigation as any).navigate("CategoryForm")}
          style={{ marginBottom: spacing.md }}
        />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>All categories</Text>
          <Text style={styles.count}>{categories.length}</Text>
        </View>

        {isLoading && categories.length === 0 ? (
          <LoadingSpinner message="Loading categories..." />
        ) : categories.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="folder-plus" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptyText}>
              Add your first category so businesses can start posting gigs.
            </Text>
            <Button
              title="+ Add Category"
              onPress={() => (navigation as any).navigate("CategoryForm")}
              size="sm"
              style={{ marginTop: spacing.md }}
            />
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Feather name="tag" size={14} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  {category.description ? (
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  ) : null}
                </View>
                <TrustBadge
                  label={category.isActive ? "Active" : "Inactive"}
                  variant={category.isActive ? "success" : "muted"}
                />
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => (navigation as any).navigate("CategoryForm", { categoryId: category.id })}
                >
                  <Feather name="edit-2" size={12} color={colors.text} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, category.isActive && styles.deactivateButton]}
                  onPress={() => toggleStatus(category)}
                >
                  <Feather
                    name={category.isActive ? "eye-off" : "eye"}
                    size={12}
                    color={category.isActive ? colors.danger : colors.success}
                  />
                  <Text
                    style={[
                      styles.actionText,
                      { color: category.isActive ? colors.danger : colors.success },
                    ]}
                  >
                    {category.isActive ? "Deactivate" : "Activate"}
                  </Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: "transparent",
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
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
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
  count: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: "700",
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
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
  categoryCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  categoryName: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.text,
  },
  categoryDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    marginRight: spacing.sm,
  },
  deactivateButton: {
    backgroundColor: colors.dangerLight,
  },
  actionText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.text,
    marginLeft: spacing.xs,
  },
});
