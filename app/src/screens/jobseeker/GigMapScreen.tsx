import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import * as gigPostApi from "../../api/gigPostApi";
import { LeafletMap } from "../../components/map/LeafletMap";
import type { MapMarker } from "../../components/map/leafletHtml";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { GIG_PAYMENT_TYPES } from "../../utils/constants";
import type { GigPost } from "../../types";
import type { JobSeekerStackParamList } from "../../navigation/JobSeekerTabs";

// Clears the floating tab bar so the gig card is never hidden behind it.
const TAB_BAR_CLEARANCE = 92;

function paymentTypeLabel(value: string): string {
  return GIG_PAYMENT_TYPES.find((pt) => pt.value === value)?.label ?? value;
}

/** Compact pay label for a map pin, e.g. "Rs. 2.5k". */
function pinLabel(amount: number): string {
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return `Rs. ${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }
  return `Rs. ${amount}`;
}

function hasPin(gig: GigPost): gig is GigPost & { latitude: number; longitude: number } {
  return gig.latitude != null && gig.longitude != null;
}

export const GigMapScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<JobSeekerStackParamList>>();
  const insets = useSafeAreaInsets();

  const [gigs, setGigs] = useState<GigPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      if (id === request.current) setError(e instanceof Error ? e.message : "Could not load gigs.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        request.current++;
      };
    }, [refresh])
  );

  const pinnedGigs = useMemo(() => gigs.filter((g) => g.status === "ACTIVE").filter(hasPin), [gigs]);

  const markers = useMemo<MapMarker[]>(
    () =>
      pinnedGigs.map((g) => ({
        id: g.id,
        latitude: g.latitude,
        longitude: g.longitude,
        label: pinLabel(g.paymentAmount),
      })),
    [pinnedGigs]
  );

  const selected = pinnedGigs.find((g) => g.id === selectedId) ?? null;
  const remaining = selected ? Math.max(selected.workersNeeded - (selected.filledPositions ?? 0), 0) : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back to the gig list"
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Gigs near you</Text>
          <Text style={styles.subtitle}>
            {loading
              ? "Loading gigs..."
              : `${pinnedGigs.length} ${pinnedGigs.length === 1 ? "gig" : "gigs"} on the map`}
          </Text>
        </View>
      </View>

      <View style={styles.mapWrap}>
        <LeafletMap
          markers={markers}
          selectedId={selectedId}
          onMarkerPress={setSelectedId}
          onMapPress={() => setSelectedId(null)}
          style={styles.map}
        />

        {loading ? (
          <View style={styles.overlay} pointerEvents="none">
            <LoadingSpinner message="Finding gigs on the map..." />
          </View>
        ) : null}

        {!loading && (error || pinnedGigs.length === 0) ? (
          <View style={[styles.notice, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
            <Feather name={error ? "wifi-off" : "map"} size={18} color={colors.primaryDark} />
            <View style={{ flex: 1, marginLeft: spacing.sm + spacing.xs }}>
              <Text style={styles.noticeTitle}>{error ? "Couldn't load gigs" : "No gigs on the map yet"}</Text>
              <Text style={styles.noticeText}>
                {error ?? "Gigs appear here once a business pins their location. Check the list for all gigs."}
              </Text>
            </View>
            {error ? (
              <TouchableOpacity onPress={() => void refresh()} accessibilityRole="button">
                <Text style={styles.retry}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {selected ? (
          <TouchableOpacity
            style={[styles.gigCard, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("GigDetail", { gigId: selected.id })}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${selected.title}`}
          >
            <View style={styles.gigCardTop}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {selected.category?.name ?? "General"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedId(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close gig preview"
              >
                <Feather name="x" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.gigTitle} numberOfLines={1}>
              {selected.title}
            </Text>
            <Text style={styles.gigMeta} numberOfLines={1}>
              {selected.business?.name ?? "WorkNest Business"} • {selected.location}
            </Text>

            <View style={styles.gigCardBottom}>
              <View>
                <Text style={styles.gigPay}>
                  Rs. {selected.paymentAmount.toLocaleString("en-LK")}
                  <Text style={styles.gigPayType}> / {paymentTypeLabel(selected.paymentType)}</Text>
                </Text>
                <Text style={styles.gigSpots}>
                  {remaining === 0 ? "All positions filled" : `${remaining} of ${selected.workersNeeded} spots left`}
                </Text>
              </View>
              <View style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View gig</Text>
                <Feather name="arrow-right" size={14} color={colors.textInverse} />
              </View>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + spacing.xs,
    ...shadows.subtle,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  mapWrap: {
    flex: 1,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(238, 245, 246, 0.7)",
  },
  notice: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md - 2,
    ...shadows.subtle,
  },
  noticeTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  noticeText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  retry: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  gigCard: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.subtle,
  },
  gigCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    maxWidth: "80%",
  },
  categoryText: {
    fontSize: typography.sizes.xxs,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  gigTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.text,
  },
  gigMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  gigCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm + spacing.xs,
  },
  gigPay: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  gigPayType: {
    fontSize: typography.sizes.xs,
    fontWeight: "500",
    color: colors.textMuted,
  },
  gigSpots: {
    fontSize: typography.sizes.xxs,
    color: colors.textMuted,
    marginTop: 2,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    gap: spacing.xs + 2,
  },
  viewButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.textInverse,
  },
});
