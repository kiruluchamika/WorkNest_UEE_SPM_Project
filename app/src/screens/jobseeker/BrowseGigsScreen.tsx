import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import * as gigPostApi from "../../api/gigPostApi";
import { GigCard } from "../../components/gig/GigCard";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { AppHeader } from "../../components/common/AppHeader";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { GigPost } from "../../types";

export const BrowseGigsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [gigs, setGigs] = useState<GigPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [locationQuery, setLocationQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await gigPostApi.listActiveGigPosts();
      setGigs(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load available gigs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const categories = React.useMemo(() => {
    const byId = new Map<string, string>();
    gigs.forEach((gig) => {
      if (gig.category?.id) {
        byId.set(gig.category.id, gig.category.name);
      }
    });
    return Array.from(byId, ([value, label]) => ({ value, label }));
  }, [gigs]);

  const filtered = gigs.filter((g) => {
    const matchesCategory = category === "all" || g.categoryId === category;
    const matchesLocation =
      locationQuery.trim() === "" ||
      g.location.toLowerCase().includes(locationQuery.toLowerCase());
    return matchesCategory && matchesLocation && g.status === "ACTIVE";
  });

  const handlePress = (gig: GigPost) => {
    (navigation as any).navigate("GigDetail", { gigId: gig.id });
  };



  if (isLoading && gigs.length === 0) {
    return <LoadingSpinner fullScreen message="Finding gigs near you..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <AppHeader subtitle="Find gigs near you" />
      <View style={styles.header}>
        <Text style={styles.title}>Browse Gigs</Text>
        <View style={styles.searchRow}>
          <Feather name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find gigs near you..."
            placeholderTextColor={colors.textMuted}
            value={locationQuery}
            onChangeText={setLocationQuery}
          />
        </View>
      </View>

      <View style={styles.categories}>
        {[{ value: "all", label: "All" }, ...categories].map((item) => (
          <TouchableOpacity
            key={item.value}
            onPress={() => setCategory(item.value)}
            style={[
              styles.categoryChip,
              category === item.value && {
                backgroundColor: colors.primaryDark,
                borderColor: colors.primaryDark,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                category === item.value && { color: colors.textInverse, fontWeight: "700" },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GigCard gig={item} onPress={handlePress} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {loadError ?? "No open gigs match your filters."}
            </Text>
            {loadError ? (
              <TouchableOpacity onPress={refresh}>
                <Text style={styles.clear}>Try again</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { setCategory("all"); setLocationQuery(""); }}>
                <Text style={styles.clear}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  list: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  empty: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.base,
    marginBottom: spacing.sm,
  },
  clear: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
